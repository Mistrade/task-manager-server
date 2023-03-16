import { EventModelType } from '../../../../../mongo/models/event.model';
import { Schema } from 'mongoose';

interface NodeType<EventType = EventModelType> {
  _id: string;
  _parentId: string | null;
  event: EventType;
  child: Array<NodeType<EventType>>;
}

interface BeforeMergeArrayItem<EventType = EventModelType> {
  _id: string;
  event: EventType;
}

type BeforeMergedChildrenArray<EventType = EventModelType> = Array<
  BeforeMergeArrayItem<EventType>
>;

interface BeforeMergeObject<EventType = EventModelType> {
  [key: string]: BeforeMergedChildrenArray<EventType>;
}

type ExtendableEventType = Pick<EventModelType, '_id' | 'parentId'>;

interface CanImPushChildEventOptions {
  childEventId: Array<Schema.Types.ObjectId>;
  parentEventId: Schema.Types.ObjectId;
}

interface CanImPushError {
  forbiddenId: Array<Schema.Types.ObjectId>;
  message: string;
}

interface CanImPushChildEventFnReturned<State extends boolean = boolean> {
  state: State;
  error?: CanImPushError;
}

type PathsObj<EventType> = {
  [key: string]: PathsObjPropertyType<EventType>;
};

interface PathsObjPropertyType<EventType> {
  parentsIds: Array<string>;
  childsIds: Array<string>;
  event: EventType;
}

export class EventTree<
  InitialEventType extends ExtendableEventType = EventModelType
> {
  public eventTree: NodeType<InitialEventType> | null;
  public paths: PathsObj<InitialEventType>;

  constructor(arr: Array<InitialEventType>) {
    this.paths = {};
    this.eventTree = this.generateEventTree(arr);
  }

  //Это метод для углубления в дерево
  private mergeChildren(
    //Ид родителя на текущем уровне
    _parentId: string | null,
    //Список детей на текущем уровне
    children: BeforeMergedChildrenArray<InitialEventType>,
    //Плоское дерево
    store: BeforeMergeObject<InitialEventType>,
    //Предыдущий путь до корня дерева
    prevPath: Array<string>
  ): Array<NodeType<InitialEventType>> {
    //Копирую весь путь, чтобы не перезаписать случайно
    const path = [...prevPath];

    //Возвращаю массив детей, только каждый элемент в массиве заменяю на узел дерева
    return children.map((item) => {
      //Достаю всех детей для итерируемого события из плоского дерева
      const childrenItem: BeforeMergedChildrenArray<InitialEventType> =
        store[item._id];
      //Регистрирую пути родителей
      this.paths[item._id] = {
        parentsIds: path,
        childsIds: [],
        event: item.event,
      };

      //Регистрирую детей на текущем уровне
      path.forEach((parentPath) => {
        this.paths[parentPath].childsIds.push(item._id);
      });

      //Возвращаю узел дерева
      return {
        _parentId,
        _id: item._id,
        event: item.event,
        path,
        //И так по кругу, пока все события не будут добавлены
        child: this.mergeChildren(item._id, childrenItem || [], store, [
          ...path,
          item._id,
        ]),
      };
    });
  }

  //Метод создающий дерево событий
  private generateEventTree(
    arr: Array<InitialEventType> //На вход получаю массив из всех событий в дереве (достаются по treeId из базы)
  ): NodeType<InitialEventType> | null {
    if (!arr || !arr.length) {
      return null;
    }

    //Создаю плоскую модель дерева по паре ключ - значение, где ключ - id события, а значение - это дети 0 уровня
    const obj: BeforeMergeObject<InitialEventType> = {};
    //Это корень дерева - событие, которое стоит во главе
    let root: InitialEventType | null = null;

    //В цикле прохожусь по пришедшему массиву событий внутри плоского дерева
    arr.forEach((event) => {
      //uuid трансформирую в строку
      const eventId = event._id.toString();

      //Проверяю наличие родителя
      if (event.parentId) {
        //Если родитель есть, то создаю его uuid в виде строки
        const pId = event.parentId.toString();

        //Проверяю есть ли уже в плоской модели дерева этот родитель или нет
        if (!obj[pId]) {
          //Если нету - то создаю ключ и массив с единственным - текущим(итерируемым) событием
          return (obj[pId] = [
            {
              _id: eventId,
              event,
            },
          ]);
        }

        //Если есть - то просто кладу ему ребенка в конец массива
        return obj[pId].push({
          _id: eventId,
          event,
        });
      }

      //Ну и в этом же цикле ищу корень, чтобы заново весь массив не лопатить
      return (root = event);
    });

    //Если корень не найден - юзер идет нахуй))) гыгыг
    if (!root) {
      return null;
    }

    root = root as InitialEventType;

    //Так же создаю строку из uuid корня дерева
    const rootId = root._id.toString();
    //Беру из плоского дерева всех его детей
    const rootChildren = obj[rootId];

    //В путях регистрирую корень - с пустыми родителями и детьми
    this.paths[rootId] = {
      parentsIds: [],
      childsIds: [],
      event: root,
    };

    //Возвращаю дерево
    return {
      _parentId: null,
      _id: rootId,
      event: root,
      //Вот тут в child происходит самое интересное - углубление в дерево, рекурсивный метод, который сформирует всю вложенность
      //На вход ему скармливаю rootId - строковый id корня дерева, детей на текущем уровне, плоское дерево и сформированный путь для детей rootChildren,
      child: this.mergeChildren(rootId, rootChildren || [], obj, [rootId]),
    };
  }
}
