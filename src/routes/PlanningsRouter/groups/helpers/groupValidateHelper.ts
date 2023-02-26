import {ResponseException} from "../../../../exceptions/ResponseException";
import {colorRegExpDefault, colorRegExpRGBA} from "../../../../common/constants";

export class GroupValidateHelper {
	constructor() {
	}
	
	/** @name validateGroupTitle
	 * @summary - проверяет длину заголовка группы событий
	 * @description - от 5 до 20 символов включительно
	 * @param title - заголовок группы событий
	 * @protected
	 * @return boolean
	 * @since 26.02.2023
	 */
	protected validateGroupTitle(title: string): boolean {
		const length = title.trim().length
		const isValidTitle = length <= 20 && length >= 5
		if(!isValidTitle){
			throw new ResponseException(
				ResponseException.createObject(400, 'warning', 'Заголовок группы событий должен быть от 5 до 20 символов')
			)
		}
		
		return true
	}
	
	/** @name validateGroupColor
	 * @summary - проверяет валидность полученного цвета группы событий
	 * @description - формат hex или rgb(a)
	 * @param color - полученное значение цвета
	 * @protected
	 * @return boolean
	 * @since 26.02.2023
	 */
	protected validateGroupColor(color: string): boolean {
		const resultColor = color.trim()
		const isValidColor = colorRegExpRGBA.test(resultColor) || colorRegExpDefault.test(resultColor)
		
		if(!isValidColor){
			throw new ResponseException(
				ResponseException.createObject(400, 'warning', 'Цвет должен быть в формате HEX или RGB/RGBA')
			)
		}
		
		return true
	}
}