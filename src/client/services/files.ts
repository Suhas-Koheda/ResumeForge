import { useBuilderStore } from '../store/useBuilderStore';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

const getAuthHeaders = (): Record<string, string> => {
    const token = useBuilderStore.getState().token;
    return token
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
};

export const fileService = {
    async listFiles(): Promise<string[]> {
        const response = await fetch(`${API_BASE_URL}/files`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to list files');
        return response.json();
    },

    async readFile(path: string): Promise<string> {
        const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(path)}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error(`Failed to read file: ${path}`);
        const data = await response.json();
        return data.content;
    },

    async writeFile(path: string, content: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/files`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ path, content })
        });
        if (!response.ok) throw new Error(`Failed to write file: ${path}`);
    },

    async deleteFile(path: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(path)}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error(`Failed to delete file: ${path}`);
    },

    async renameFile(oldPath: string, newPath: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/files/rename`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ oldPath, newPath })
        });
        if (!response.ok) throw new Error(`Failed to rename file from ${oldPath} to ${newPath}`);
    }
};
