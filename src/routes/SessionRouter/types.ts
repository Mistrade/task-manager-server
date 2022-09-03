export interface RegistrationRequestBody {
	phone: string,
	password: string,
	name: string,
	surname: string
}

export interface RegistrationResponseBody {

}

export type RegistrationResponseResult = RegistrationResponseBody