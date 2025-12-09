export interface IElectronAPI {
    login: (credentials: { username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
    getEmployees: () => Promise<any[]>;
    getEmployee: (id: string) => Promise<any>;
    saveEmployee: (id: string, data: any) => Promise<{ success: boolean; error?: string }>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
