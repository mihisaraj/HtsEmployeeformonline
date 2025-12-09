import { useEffect, useState } from 'react';

interface CustomField {
  category: string;
  label: string;
  value: string;
}

interface Employee {
  _id: string;
  passportName: string;
  callingName: string;
  passportNo: string;
  profileEmail: string;
  customFields?: CustomField[];
  [key: string]: any; // Allow other fields
}

export default function EmployeeDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  
  // New Field State
  const [newField, setNewField] = useState<CustomField>({ category: '', label: '', value: '' });

  const loadEmployee = async () => {
    setLoading(true);
    const data = await window.electronAPI.getEmployee(id);
    if (!data.customFields) data.customFields = [];
    setEmployee(data);
    setLoading(false);
  };

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const handleChange = (field: string, value: string) => {
    if (!employee) return;
    setEmployee({ ...employee, [field]: value });
  };

  const handleCustomFieldChange = (index: number, key: keyof CustomField, value: string) => {
    if (!employee || !employee.customFields) return;
    const updated = [...employee.customFields];
    updated[index] = { ...updated[index], [key]: value };
    setEmployee({ ...employee, customFields: updated });
  };

  const addCustomField = () => {
    if (!employee) return;
    if (!newField.category || !newField.label || !newField.value) {
      alert("Please fill all parts of the new field");
      return;
    }
    const updated = [...(employee.customFields || []), newField];
    setEmployee({ ...employee, customFields: updated });
    setNewField({ category: '', label: '', value: '' });
  };

  const removeCustomField = (index: number) => {
    if (!employee || !employee.customFields) return;
    const updated = employee.customFields.filter((_, i) => i !== index);
    setEmployee({ ...employee, customFields: updated });
  };

  const saveEmployee = async () => {
    if (!employee) return;
    const result = await window.electronAPI.saveEmployee(employee._id, employee);
    if (result.success) {
      alert('Saved successfully!');
    } else {
      alert('Error saving: ' + result.error);
    }
  };

  if (loading || !employee) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-100">
      <button onClick={onBack} className="mb-6 text-blue-400 hover:text-blue-300 font-medium">
        ← Back to List
      </button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{employee.passportName || 'Employee Details'}</h1>
        <button onClick={saveEmployee} className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold shadow-lg shadow-green-900/50 transition-all">
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-blue-300 border-b border-gray-700 pb-2">Basic Info</h2>
          <div className="space-y-4">
            <Field label="Passport Name" value={employee.passportName} onChange={(v) => handleChange('passportName', v)} />
            <Field label="Calling Name" value={employee.callingName} onChange={(v) => handleChange('callingName', v)} />
            <Field label="Passport / NIC" value={employee.passportNo} onChange={(v) => handleChange('passportNo', v)} />
            <Field label="Email" value={employee.profileEmail} onChange={(v) => handleChange('profileEmail', v)} />
            <Field label="Contact Number" value={employee.contactNumber} onChange={(v) => handleChange('contactNumber', v)} />
            <Field label="Nationality" value={employee.nationality} onChange={(v) => handleChange('nationality', v)} />
          </div>
        </div>

        {/* Dynamic Fields */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-purple-300 border-b border-gray-700 pb-2">Additional Information</h2>
          
          <div className="space-y-4 mb-6">
            {employee.customFields?.map((field, index) => (
              <div key={index} className="flex gap-2 items-end bg-gray-750 p-3 rounded border border-gray-600">
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Category</label>
                  <input
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                    value={field.category}
                    onChange={(e) => handleCustomFieldChange(index, 'category', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Label</label>
                  <input
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                    value={field.label}
                    onChange={(e) => handleCustomFieldChange(index, 'label', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Value</label>
                  <input
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm"
                    value={field.value}
                    onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => removeCustomField(index)}
                  className="bg-red-900/50 hover:bg-red-900 text-red-200 p-2 rounded"
                >
                  ✕
                </button>
              </div>
            ))}
            {(!employee.customFields || employee.customFields.length === 0) && (
              <p className="text-gray-500 italic text-sm">No custom fields added yet.</p>
            )}
          </div>

          <div className="bg-gray-700/50 p-4 rounded border border-dashed border-gray-500">
            <h3 className="text-sm font-medium mb-2 text-gray-300">Add New Field</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input 
                placeholder="Category (e.g. Sales)" 
                className="bg-gray-800 border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500"
                value={newField.category}
                onChange={(e) => setNewField({...newField, category: e.target.value})}
              />
              <input 
                placeholder="Label (e.g. Region)" 
                className="bg-gray-800 border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500"
                value={newField.label}
                onChange={(e) => setNewField({...newField, label: e.target.value})}
              />
              <input 
                placeholder="Value (e.g. APAC)" 
                className="bg-gray-800 border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500"
                value={newField.value}
                onChange={(e) => setNewField({...newField, value: e.target.value})}
              />
            </div>
            <button onClick={addCustomField} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-1 rounded">
              Add Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  );
}
