import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import mongoose from 'mongoose';
import 'dotenv/config'; // Side-effect import for Dotenv

// ... (Schema definitions remain same, verify I don't delete them) ...
// Actually, I need to be careful with replace.

// --- MongoDB Schema ---
// ...

// To be safe, I will replace the top imports and the window creation logic separately.


// --- MongoDB Schema ---

// Using "Strict: false" to allow dynamic fields without predefined schema
const EmployeeSchema = new mongoose.Schema(
    {
        // Profile
        profileName: String,
        profileEmail: String,

        passportName: String,
        callingName: String,
        passportNo: { type: String, unique: true }, // Index but not required here to avoid blocking legacy data? Actually user asked for it as primary key.

        // We allow other fields via strict: false, but defining known ones helps helper tools
        customFields: [{
            category: String,
            label: String,
            value: String
        }]
    },
    { strict: false, timestamps: true }
);

const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

// --- Window Management ---
let mainWindow: BrowserWindow | null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Dev mode check: if env var is set OR if we are just running commonly in dev
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL(devUrl);
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- App Lifecycle ---
app.whenReady().then(async () => {
    // Connect to MongoDB
    if (process.env.MONGODB_URI) {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('Connected to MongoDB');
        } catch (err) {
            console.error('Failed to connect to MongoDB', err);
        }
    } else {
        console.warn('MONGODB_URI not found in .env');
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- IPC Handlers ---

// Login (Simple Hardcoded)
ipcMain.handle('login', async (_, { username, password }) => {
    if (username === 'htsHR' && password === 'HTS') {
        return { success: true };
    }
    return { success: false, error: 'Invalid credentials' };
});

// Get All Employees
ipcMain.handle('get-employees', async () => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 }).lean();
        // Map _id to string
        return JSON.parse(JSON.stringify(employees));
    } catch (error) {
        console.error(error);
        return [];
    }
});

// Get Single Employee
ipcMain.handle('get-employee', async (_, id) => {
    try {
        const employee = await Employee.findById(id).lean();
        return JSON.parse(JSON.stringify(employee));
    } catch (error) {
        return null;
    }
});

// Save (Update) Employee
ipcMain.handle('save-employee', async (_, { id, data }) => {
    try {
        // If id exists, update. Else create (though usually we create via form, this is for edits)
        if (id) {
            await Employee.findByIdAndUpdate(id, data);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
});
