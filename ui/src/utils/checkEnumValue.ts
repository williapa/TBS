const checkEnumValue = (value: string, enumType: any): boolean => {
  for (const enumValue in enumType) {
    if (enumType[enumValue] === value) {
      return true;
    }
  }
  return false;
};

export default checkEnumValue;
