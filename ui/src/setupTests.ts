import '@testing-library/jest-dom/vitest';
import { TextDecoder, TextEncoder } from 'node:util';

if (!global.TextDecoder) global.TextDecoder = TextDecoder as typeof global.TextDecoder;
if (!global.TextEncoder) global.TextEncoder = TextEncoder as typeof global.TextEncoder;
