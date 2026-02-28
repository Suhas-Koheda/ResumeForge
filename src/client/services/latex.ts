import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const latexServerService = {
    async compileLatexToPdf(latexCode: string): Promise<Blob> {
        const response = await axios.post(`${API_URL}/export/pdf`, { latexCode }, {
            responseType: 'blob',
            withCredentials: true
        });
        return response.data;
    }
};
