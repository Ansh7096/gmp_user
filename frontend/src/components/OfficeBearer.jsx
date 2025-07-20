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
                        {icon}
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
    const [isInfoModalOpen, setInfoModalOpen] = useState(false); // New info modal state
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
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    };

    const openAssignModal = (g) => { setSelectedGrievance(g); setSelectedWorker(''); setAssignModalOpen(true); };
    const openInfoModal = (g) => { setSelectedGrievance(g); setInfoModalOpen(true); };

    const handleAssignGrievance = async () => {
        if (!selectedWorker) return toast.error("Please select a worker.");
        const id = toast.loading('Assigning grievance...');
        try {
            const res = await fetch(`${API_BASE_URL}/grievances/${encodeURIComponent(selectedGrievance.ticket_id)}/assign`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId: selectedWorker, officeBearerEmail: localStorage.getItem("userEmail") })
            });
            if (!res.ok) throw new Error();
            setGrievances(grievances.map(g => g.ticket_id === selectedGrievance.ticket_id ? { ...g, status: 'In Progress' } : g));
            setAssignModalOpen(false); toast.success("Grievance assigned successfully!", { id });
        } catch (e) { toast.error("Failed to assign grievance.", { id }); }
    };

    const resolveGrievance = async (ticketId) => {
        const id = toast.loading('Resolving grievance...');
        try {
            const res = await fetch(`${API_BASE_URL}/grievances/${encodeURIComponent(ticketId)}/resolve`, { method: 'PUT' });
            if (!res.ok) throw new Error();
            setGrievances(grievances.map(g => g.ticket_id === ticketId ? { ...g, status: 'Resolved' } : g));
            toast.success("Grievance resolved successfully!", { id });
        } catch { toast.error("Failed to resolve grievance.", { id }); }
    };

    const handleResolveGrievance = (ticketId) => toast((t) => (
        <span className="flex flex-col items-center gap-2">
            Are you sure you want to mark this as resolved?
            <div className="flex gap-4 mt-2">
                <button onClick={() => { toast.dismiss(t.id); resolveGrievance(ticketId);} } className="bg-green-500 text-white px-3 py-1 rounded">Yes</button>
                <button onClick={() => toast.dismiss(t.id)} className="bg-red-500 text-white px-3 py-1 rounded">No</button>
            </div>
        </span>
    ));

    const handleAddWorker = async (e) => {
        e.preventDefault(); const id = toast.loading('Adding worker...');
        try {
            const res = await fetch(`${API_BASE_URL}/grievances/workers`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...newWorker, department_id: departmentId }) });
            const data = await res.json(); if (!res.ok) throw new Error(data.error);
            setWorkers([...workers, { id: data.workerId, ...newWorker }]);
            setNewWorker({ name:'', email:'', phone_number:'' }); setAddWorkerModalOpen(false);
            toast.success("Worker added successfully!", { id });
        } catch (e) { toast.error(e.message||"Failed to add worker.", { id }); }
    };

    const handlePrint = (g) => {
        const w = window.open('','_blank');
        w.document.write(`...`); w.document.close(); w.print();
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 font-semibold">Error: {error}</div>;

    return (
        <> ...render table with Info button similar to code above...
            <Modal isOpen={isAssignModalOpen} onClose={()=>setAssignModalOpen(false)} title="Assign Grievance" icon={<FileSignature size={24} className="text-blue-600" />}>
                {/* assignment form */}
            </Modal>
            <Modal isOpen={isAddWorkerModalOpen} onClose={()=>setAddWorkerModalOpen(false)} title="Add New Worker" icon={<UserPlus size={24} className="text-blue-600" />}>
                {/* add worker form */}
            </Modal>
            <Modal isOpen={isInfoModalOpen} onClose={()=>setInfoModalOpen(false)} title="Assignment Information" icon={<Info size={24} className="text-blue-600" />}>
                {selectedGrievance && (
                    <div className="space-y-3 text-gray-700">
                        <p><strong>Ticket ID:</strong> {selectedGrievance.ticket_id}</p>
                        <p><strong>Assigned To:</strong> {selectedGrievance.worker_name || 'N/A'}</p>
                        <p><strong>Worker Contact:</strong> {selectedGrievance.worker_phone_number || 'N/A'}</p>
                        <p><strong>Last Update:</strong> {new Date(selectedGrievance.updated_at).toLocaleString('en-IN', { year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'numeric', hour12:true })}</p>
                    </div>
                )}
            </Modal>
        </>
    );
}
