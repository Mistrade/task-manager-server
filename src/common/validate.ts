import { IValidatePhoneOrEmail } from './types';
import { string } from 'yup';

export class Validate {
  public static phoneTestRegExp = /^((\+7|7|8)+([0-9]){10})$/;
  public static emailValidationSchema = string().email();

  public static async validatePhoneOrNumber(
    value: string
  ): Promise<IValidatePhoneOrEmail | null> {
    const isPhone = this.validatePhone(value);
    if (isPhone) {
      return {
        type: 'phone',
      };
    }

    const isEmail = await this.validateEmail(value);

    if (isEmail) {
      return {
        type: 'email',
      };
    }

    return null;
  }

  public static standardizePhone(value: string) {
    const onlyNumbers = value.replace(/\D/g, '');

    if (!onlyNumbers.startsWith('7')) {
      return `7${onlyNumbers.slice(1)}`;
    }

    return onlyNumbers;
  }

  public static validatePhone(value: string): boolean {
    return this.phoneTestRegExp.test(value.toLowerCase());
  }

  public static async validateEmail(value: string): Promise<boolean> {
    try {
      const result = await this.emailValidationSchema.validate(value, {
        abortEarly: false,
        strict: true,
      });

      return !!result;
    } catch (e) {
      return false;
    }
  }
}
