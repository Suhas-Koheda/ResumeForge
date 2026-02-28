import { manualLatexGenerator } from './src/client/services/manualLatex.js';
import { latexService } from './src/server/services/latex.js';
import fs from 'fs/promises';

async function testFullFlow() {
    const blocks: any = [
        {
            id: '1',
            type: 'header',
            data: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '123-456-7890',
                location: 'New York, NY'
            }
        },
        {
            id: '2',
            type: 'experience',
            data: {
                company: 'Tech Corp',
                role: 'Senior Engineer',
                duration: '2020 - Present',
                location: 'Remote',
                highlights: ['Built amazing things', 'Led a team of experts']
            }
        }
    ];

    console.log("Generating LaTeX...");
    const latex = manualLatexGenerator.generate(blocks);
    console.log("LaTeX Length:", latex.length);
    
    try {
        console.log("Starting Tectonic compilation...");
        const pdf = await latexService.compileToPdf(latex);
        await fs.writeFile('final_test.pdf', pdf);
        console.log("SUCCESS: final_test.pdf created. Length:", pdf.length);
    } catch (e: any) {
        console.error("COMPILATION FAILED:");
        console.error(e.message);
    }
}

testFullFlow();
