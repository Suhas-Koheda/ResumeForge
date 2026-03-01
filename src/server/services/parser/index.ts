import { LatexParserEngine } from './parser.js';
import { JakesResumeAdapter } from './adapters/jakes.js';
import { ModernCvAdapter } from './adapters/moderncv.js';
import { UdoySahaAdapter } from './adapters/udoysaha.js';
import { CurveAdapter } from './adapters/curve.js';

export const latexParserService = new LatexParserEngine([
    new UdoySahaAdapter(),
    new JakesResumeAdapter(),
    new ModernCvAdapter(),
    new CurveAdapter()
]);
