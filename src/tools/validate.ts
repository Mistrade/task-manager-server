export const validateRegularExpression = {
	cyrillicSymbols(){
		return new RegExp(/[А-Яа-яЁё]+/gi)
	}
}

const checkPassword = (password: string) => {
	const checkLength = isLength(password, 8, 32, '>=')
	
	if(!checkLength){
		return { status: false, message: `Пароль должен быть длиннее 8 символов и короче 32 символов.` }
	}
	
	const checkCyrillic = validateRegularExpression.cyrillicSymbols().test(password)
	
	if(checkCyrillic){
		return {
			status: false,
			message: 'В пароле запрещено использовать кириллицу.'
		}
	}
	
	return {
		status: true,
		message: ''
	}
	
}

const isLength = (str: string, min: number, max: number, pattern = '>=') => {
	if(pattern === '>='){
		return str.length >= min && str.length <= max
	} else {
		return str.length > min && str.length < max
	}
}

export const validateTools = {
	isLength,
	checkPassword
}