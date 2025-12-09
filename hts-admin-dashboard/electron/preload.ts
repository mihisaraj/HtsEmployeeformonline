import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    login: (credentials: any) => ipcRenderer.invoke('login', credentials),
    getEmployees: () => ipcRenderer.invoke('get-employees'),
    getEmployee: (id: string) => ipcRenderer.invoke('get-employee', id),
    saveEmployee: (id: string, data: any) => ipcRenderer.invoke('save-employee', { id, data }),
});
