import { useEffect, useState } from 'react';

interface Employee {
  _id: string;
  passportName?: string;
  callingName?: string;
  passportNo?: string;
  profileEmail?: string;
  customFields?: { category: string; value: string }[];
}

export default function Dashboard({ onSelect }: { onSelect: (id: string) => void }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');

  const loadEmployees = async () => {
    const data = await window.electronAPI.getEmployees();
    setEmployees(data);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filtered = employees.filter(e => 
    (e.passportName || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.passportNo || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-400">Employee Database</h1>
        <button onClick={loadEmployees} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
          Refresh
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by Name or Passport/NIC..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded p-3 mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
      />

      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-700 text-gray-300">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Passport / NIC</th>
              <th className="p-4">Email</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filtered.map((emp) => (
              <tr key={emp._id} className="hover:bg-gray-750 transition-colors">
                <td className="p-4">{emp.passportName || emp.callingName || 'Unknown'}</td>
                <td className="p-4">{emp.passportNo || '-'}</td>
                <td className="p-4">{emp.profileEmail || '-'}</td>
                <td className="p-4">
                  <button
                    onClick={() => onSelect(emp._id)}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    View / Edit
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
