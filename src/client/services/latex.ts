import axios from 'axios';
import { useBuilderStore } from '../store/useBuilderStore';

const API_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

export const latexServerService = {
    async compileLatexToPdf(latexCode: string): Promise<Blob> {
        const token = useBuilderStore.getState().token;
        
        const response = await axios.post(`${API_URL}/export/pdf`, { latexCode }, {
            responseType: 'blob',
            withCredentials: true,
            headers: token ? {
                'Authorization': `Bearer ${token}`
            } : {}
        });
        return response.data;
    }
};
