import { LatexParserEngine } from './parser.js';
import { JakesResumeAdapter } from './adapters/jakes.js';
import { ModernCvAdapter } from './adapters/moderncv.js';
import { UdoySahaAdapter } from './adapters/udoysaha.js';

export const latexParserService = new LatexParserEngine([
    new UdoySahaAdapter(),
    new JakesResumeAdapter(),
    new ModernCvAdapter()
]);
