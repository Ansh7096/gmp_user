import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, ChevronUp, Printer, X, UserPlus, FileSignature, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// This updated Modal component provides the semi-transparent, blurred WHITE backdrop
const Modal = ({ isOpen, onClose, title, icon, children }) => {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 bg-red-blue bg-opacity-25 backdrop-blur-sm flex justify-center items-center"
            style={{ zIndex: 1000 }} // Ensure modal is on top
        >
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 animate-enter">
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                        {icon} {/* Render the passed icon */}
                        {title}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition">
                        <X size={24} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default function OfficeBearer() {
    const [grievances, setGrievances] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });

    const [isAssignModalOpen, setAssignModalOpen] = useState(false);
    const [isAddWorkerModalOpen, setAddWorkerModalOpen] = useState(false);
    const [isInfoModalOpen, setInfoModalOpen] = useState(false); // Info modal state

    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [selectedWorker, setSelectedWorker] = useState('');
    const [newWorker, setNewWorker] = useState({ name: '', email: '', phone_number: '' });

    const navigate = useNavigate();
    const departmentId = localStorage.getItem("departmentId");

    const handleLogout = () => {
        toast((t) => (
            <span className="flex flex-col items-center gap-2">
                Are you sure you want to logout?
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            localStorage.clear();
                            navigate("/login");
                        }}
                        className="bg-red-500 text-white px-3 py-1 rounded-md text-sm"
                    >
                        Yes
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-gray-300 text-black px-3 py-1 rounded-md text-sm"
                    >
                        No
                    </button>
                </div>
            </span>
        ), { duration: 6000 });
    };

    useEffect(() => {
        if (!departmentId) {
            setError("Could not find Department ID. Please log in again.");
            setIsLoading(false);
            return;
        }

        Promise.all([
            fetch(`${API_BASE_URL}/grievances/department/${departmentId}`).then(res => res.json()),
            fetch(`${API_BASE_URL}/grievances/workers/${departmentId}`).then(res => res.json())
        ]).then(([grievanceData, workerData]) => {
            setGrievances(grievanceData);
            setWorkers(workerData);
            setIsLoading(false);
        }).catch(err => {
            console.error("Fetch error:", err);
            setError("Failed to fetch data from the server.");
            toast.error("Failed to fetch data from the server.");
            setIsLoading(false);
        });
    }, [departmentId, navigate]);

    const sortedAndFilteredGrievances = useMemo(() => {
        let items = [...grievances];
        if (searchTerm) {
            items = items.filter(g => g.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (sortConfig.key) {
            items.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [grievances, searchTerm, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    };

    const handleAssignGrievance = async () => {
        if (!selectedWorker) {
            toast.error("Please select a worker.");
            return;
        }
        const toastId = toast.loading('Assigning grievance...');
        try {
            const encoded = encodeURIComponent(selectedGrievance.ticket_id);
            const email = localStorage.getItem("userEmail");
            const res = await fetch(`${API_BASE_URL}/grievances/${encoded}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId: selectedWorker, officeBearerEmail: email })
            });
            if (!res.ok) throw new Error("Failed to assign grievance.");
            setGrievances(grievances.map(g => g.ticket_id === selectedGrievance.ticket_id ? { ...g, status: 'In Progress' } : g));
            setAssignModalOpen(false);
            toast.success("Grievance assigned successfully!", { id: toastId });
        } catch (err) {
            toast.error(err.message, { id: toastId });
        }
    };

    const handleResolveGrievance = (ticketId) => {
        toast((t) => (
            <span className="flex flex-col items-center gap-2">
                Are you sure you want to mark this as resolved?
                <div className="flex gap-4 mt-2">
                    <button onClick={() => { toast.dismiss(t.id); resolveGrievance(ticketId); }} className="bg-green-500 text-white px-3 py-1 rounded">Yes</button>
                    <button onClick={() => toast.dismiss(t.id)} className="bg-red-500 text-white px-3 py-1 rounded">No</button>
                </div>
            </span>
        ));
    };

    const resolveGrievance = async (ticketId) => {
        const toastId = toast.loading('Resolving grievance...');
        try {
            const encoded = encodeURIComponent(ticketId);
            const res = await fetch(`${API_BASE_URL}/grievances/${encoded}/resolve`, { method: 'PUT' });
            if (!res.ok) throw new Error("Failed to resolve grievance.");
            setGrievances(grievances.map(g => g.ticket_id === ticketId ? { ...g, status: 'Resolved' } : g));
            toast.success("Grievance resolved successfully!", { id: toastId });
        } catch (err) {
            toast.error(err.message, { id: toastId });
        }
    };

    const handleAddWorker = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Adding worker...');
        try {
            const res = await fetch(`${API_BASE_URL}/grievances/workers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newWorker, department_id: departmentId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add worker.");
            setWorkers([...workers, { id: data.workerId, ...newWorker, department_id: departmentId }]);
            setNewWorker({ name: '', email: '', phone_number: '' });
            setAddWorkerModalOpen(false);
            toast.success("Worker added successfully!", { id: toastId });
        } catch (err) {
            toast.error(err.message, { id: toastId });
        }
    };

    const openAssignModal = (g) => { setSelectedGrievance(g); setSelectedWorker(''); setAssignModalOpen(true); };
    const openInfoModal = (g) => { setSelectedGrievance(g); setInfoModalOpen(true); };

    const handlePrint = (g) => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
                <head><title>Grievance Report - ${g.ticket_id}</title><style>body{font-family:sans-serif;padding:20px}/*...*/</style></head>
                <body>/* Details omitted for brevity */</body>
            </html>`);
        win.document.close(); win.print();
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-red-600 font-semibold">Error: {error}</div>;

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-red-300 to-blue-300 py-12 px-6">
                <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">Office Bearer Dashboard</h1>
                        <div className="flex gap-4">
                            <button onClick={() => setAddWorkerModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Add Worker</button>
                            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg">Logout</button>
                        </div>
                    </div>
                    <div className="relative mb-6">
                        <input type="text" placeholder="Search by Ticket ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 p-3 border rounded-lg focus:outline-none" />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-xl shadow text-left">
                            <thead className="bg-gray-200 text-gray-700">
                                <tr>
                                    {['ticket_id','title','urgency','status','created_at'].map(key => (
                                        <th key={key} className="py-3 px-4 cursor-pointer" onClick={() => requestSort(key)}>
                                            <div className="flex items-center gap-1">{key.replace('_',' ').toUpperCase()}{getSortIcon(key)}</div>
                                        </th>
                                    ))}
                                    <th className="py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredGrievances.map(g => (
                                    <tr key={g.ticket_id} className="border-t hover:bg-gray-50">
                                        <td className="py-3 px-4 font-mono text-sm">{g.ticket_id}</td>
                                        <td className="py-3 px-4">{g.title}</td>
                                        <td className="py-3 px-4"><span className={`font-bold ${g.urgency==='Emergency'?'text-red-600':g.urgency==='High'?'text-yellow-600':'text-green-600'}`}>{g.urgency}</span></td>
                                        <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${g.escalation_level>0?'bg-red-200 text-red-800':g.status==='Submitted'?'bg-yellow-200 text-yellow-800':g.status==='In Progress'?'bg-blue-200 text-blue-800':'bg-green-200 text-green-800'}`}>{g.escalation_level>0?'Escalated':g.status}</span></td>
                                        <td className="py-3 px-4">{new Date(g.created_at).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</td>
                                        <td className="py-3 px-4 flex gap-2">
                                            {g.escalation_level>0
                                                ? <span className="text-red-500 font-bold px-3 py-1">Locked</span>
                                                : (
                                                    <>  
                                                        {g.status==='Submitted' && <button onClick={() => openAssignModal(g)} className="bg-blue-500 text-white px-3 py-1 rounded">Assign</button>}
                                                        {(g.status==='In Progress' || g.status==='Resolved') && (
                                                            <>
                                                                {g.status==='In Progress' && <button onClick={() => handleResolveGrievance(g.ticket_id)} className="bg-green-500 text-white px-3 py-1 rounded">Resolve</button>}
                                                                <button onClick={() => openInfoModal(g)} className="bg-gray-400 text-white p-2 rounded-full"><Info size={14} /></button>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            <button onClick={() => handlePrint(g)} className="bg-gray-500 text-white p-2 rounded"><Printer size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {sortedAndFilteredGrievances.length===0 && <p className="text-center text-gray-500 mt-8">No matching grievances found.</p>}
                    </div>
                </div>
            </div>

            {/* Assign Modal */}
            <Modal isOpen={isAssignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Grievance" icon={<FileSignature size={24} className="text-blue-600" />}>
                <div className="space-y-4">
                    <p>Assign ticket <strong>{selectedGrievance?.ticket_id}</strong> to a worker:</p>
                    <select value={selectedWorker} onChange={e => setSelectedWorker(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none">
                        <option value="">Select a worker</option>
                        {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.email})</option>)}
                    </select>
                    <button onClick={handleAssignGrievance} className="w-full bg-blue-600 text-white py-3 rounded-lg">Confirm Assignment</button>
                </div>
            </Modal>

            {/* Add Worker Modal */}
            <Modal isOpen={isAddWorkerModalOpen} onClose={() => setAddWorkerModalOpen(false)} title="Add New Worker" icon={<UserPlus size={24} className="text-blue-600" />}>
                <form onSubmit={handleAddWorker} className="space-y-4">
                    <input type="text" placeholder="Worker Name" value={newWorker.name} onChange={e => setNewWorker({ ...newWorker, name: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                    <input type="email" placeholder="Worker Email" value={newWorker.email} onChange={e => setNewWorker({ ...newWorker, email: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                    <input type="tel" placeholder="Worker Phone Number" value={newWorker.phone_number} onChange={e => setNewWorker({ ...newWorker, phone_number: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg">Add Worker</button>
                </form>
            </Modal>

            {/* Info Modal */}
            <Modal isOpen={isInfoModalOpen} onClose={() => setInfoModalOpen(false)} title="Assignment Information" icon={<Info size={24} className="text-blue-600" />}>
                {selectedGrievance && (
                    <div className="space-y-3 text-gray-700">
                        <p><strong>Ticket ID:</strong> {selectedGrievance.ticket_id}</p>
                        <p><strong>Assigned To:</strong> {selectedGrievance.worker_name || 'N/A'}</p>
                        <p><strong>Worker Contact:</strong> {selectedGrievance.worker_phone_number || 'N/A'}</p>
                        <p><strong>Last Update:</strong> {new Date(selectedGrievance.updated_at).toLocaleString('en-IN', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
                        })}</p>
                    </div>
                )}
            </Modal>
        </>
    );
}
