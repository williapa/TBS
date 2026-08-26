const checkEnumValue = (
  value: string,
  enumType: Readonly<Record<string, unknown>> | readonly unknown[]
): boolean => {
  return Object.values(enumType).some((enumValue) => enumValue === value);
};

export default checkEnumValue;
