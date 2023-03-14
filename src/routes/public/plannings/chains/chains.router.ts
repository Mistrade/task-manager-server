import express from 'express';
import { connectChildrenEvent, getChainsByEventId } from './chains.controller';
import { EventModel } from '../../../../mongo/models/event.model';
import { EventTreeModel } from '../../../../mongo/models/event-tree.model';
import {
  EventHistoryEditableFieldNames,
  EventHistoryModel,
} from '../../../../mongo/models/event-history.model';

const router = express.Router();

// полный путь - /api/planning/events/chains/
router.post('/connect/clear', async (req, res) => {
  await EventModel.updateMany(
    {},
    {
      parentId: null,
      treeId: null,
    }
  );

  await EventTreeModel.deleteMany({});

  const fieldNames: Array<EventHistoryEditableFieldNames> = [
    'insertChildOfEvents',
    'removeChildOfEvents',
  ];

  await EventHistoryModel.deleteMany({
    fieldName: {
      $in: fieldNames,
    },
  });

  return res.status(200).json({});
});
router.post('/connect/children', connectChildrenEvent);
router.get('/:eventId', getChainsByEventId); //chains

export const ChainsRouter = router;
