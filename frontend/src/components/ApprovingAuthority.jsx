import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, MessageSquare, ArrowRightCircle, Filter, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonLoader from './SkeletonLoader';
import Modal from './Modal';
import axios from '../api/axiosConfig';
export default function ApprovingAuthority() {
    const [allGrievances, setAllGrievances] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [officeBearers, setOfficeBearers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isAddBearerFormVisible, setAddBearerFormVisible] = useState(false);
    const [isDeleteBearerFormVisible, setDeleteBearerFormVisible] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });
    const [departmentFilter, setDepartmentFilter] = useState('');
    const navigate = useNavigate();

    const [isTransferModalOpen, setTransferModalOpen] = useState(false);
    const [transferFormData, setTransferFormData] = useState({ ticketId: '', newDepartmentId: '' });

    const [isRevertModalOpen, setRevertModalOpen] = useState(false);
    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [revertFormData, setRevertFormData] = useState({ days: '', comment: '' });
    const [showFilters, setShowFilters] = useState(false);

    const [newOfficeBearer, setNewOfficeBearer] = useState({
        name: '', email: '', password: '', mobile_number: '', role: 'Office Bearer', department: ''
    });
    const [bearerToDelete, setBearerToDelete] = useState('');
    useEffect(() => {
        Promise.all([
            axios.get('/api/grievances/escalated'),
            axios.get('/api/grievances/departments'),
            axios.get('/api/grievances/office-bearers')
        ]).then(([grievanceRes, departmentRes, bearerRes]) => {
            setAllGrievances(grievanceRes.data);
            setDepartments(departmentRes.data);
            setOfficeBearers(bearerRes.data);
            setIsLoading(false);
        }).catch(err => {
            console.error("Fetch error:", err);
            setError("Failed to fetch dashboard data.");
            setIsLoading(false);
        });
    }, [navigate]);

    const filteredAndSortedGrievances = useMemo(() => {
        let filteredItems = [...allGrievances];
        if (departmentFilter) {
            filteredItems = filteredItems.filter(g => g.department_name === departmentFilter);
        }
        if (sortConfig.key !== null) {
            filteredItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filteredItems;
    }, [allGrievances, departmentFilter, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => (sortConfig.key === key ? (sortConfig.direction === 'ascending' ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null);

    const openRevertModal = (grievance) => {
        setSelectedGrievance(grievance);
        setRevertFormData({ days: '', comment: '' });
        setRevertModalOpen(true);
    };

    const handleRevertFormChange = (e) => setRevertFormData({ ...revertFormData, [e.target.name]: e.target.value });

    const handleRevertSubmit = async (e) => {
        e.preventDefault();
        if (!revertFormData.days || revertFormData.days <= 0) {
            toast.error("Please provide a valid number of days.");
            return;
        }
        if (!revertFormData.comment) {
            toast.error("A comment is required to revert a grievance.");
            return;
        }

        const toastId = toast.loading("Reverting grievance...");
        const authorityEmail = localStorage.getItem("userEmail");

        try {
            await axios.put(`/api/grievances/revert/${encodeURIComponent(selectedGrievance.ticket_id)}`, {
                new_resolution_days: revertFormData.days,
                comment: revertFormData.comment,
                authorityEmail: authorityEmail
            });

            setAllGrievances(allGrievances.filter(g => g.ticket_id !== selectedGrievance.ticket_id));
            setRevertModalOpen(false);
            toast.success("Grievance reverted successfully!", { id: toastId });
        } catch (err) {
            const message = err.response?.data?.error || "Failed to revert grievance.";
            toast.error(message, { id: toastId });
        }
    };

    const openTransferModal = () => {
        setTransferFormData({ ticketId: '', newDepartmentId: '' });
        setTransferModalOpen(true);
    };

    const handleTransferFormChange = (e) => setTransferFormData({ ...transferFormData, [e.target.name]: e.target.value });

    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        const { ticketId, newDepartmentId } = transferFormData;
        if (!ticketId || !newDepartmentId) {
            toast.error("Please fill out all fields for the transfer.");
            return;
        }

        const toastId = toast.loading("Transferring grievance...");
        try {
            await axios.put('/api/grievances/transfer', {
                ticketId: ticketId,
                newDepartmentId: newDepartmentId
            });

            const refreshedRes = await axios.get('/api/grievances/escalated');
            setAllGrievances(refreshedRes.data);

            setTransferModalOpen(false);
            toast.success("Grievance transferred successfully!", { id: toastId });
        } catch (err) {
            const message = err.response?.data?.error || "Failed to transfer grievance.";
            toast.error(message, { id: toastId });
        }
    };

    const handleAddOfficeBearerChange = (e) => {
        setNewOfficeBearer({ ...newOfficeBearer, [e.target.name]: e.target.value });
    };

    const handleAddOfficeBearerSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading("Adding Office Bearer...");
        try {
            const res = await axios.post('/api/grievances/add-office-bearer', newOfficeBearer);

            // Add to local state
            setOfficeBearers([...officeBearers, { ...newOfficeBearer, id: res.data.id }]);
            toast.success("Office bearer added successfully!", { id: toastId });
            setNewOfficeBearer({ name: '', email: '', password: '', mobile_number: '', role: 'Office Bearer', department: '' });
            setAddBearerFormVisible(false);
        } catch (err) {
            const message = err.response?.data?.error || "Failed to add office bearer.";
            toast.error(message, { id: toastId });
        }
    };


    const handleDeleteOfficeBearer = async (e) => {
        e.preventDefault();
        if (!bearerToDelete) {
            toast.error("Please select an office bearer to delete.");
            return;
        }

        const toastId = toast.loading("Deleting Office Bearer...");
        try {
            await axios.delete(`/api/grievances/office-bearer/${bearerToDelete}`);
            setOfficeBearers(officeBearers.filter(ob => ob.id.toString() !== bearerToDelete));
            toast.success("Office bearer deleted successfully!", { id: toastId });
            setBearerToDelete('');
            setDeleteBearerFormVisible(false);
        } catch (err) {
            const message = err.response?.data?.error || "Failed to delete office bearer.";
            toast.error(message, { id: toastId });
        }
    };

    const handleLogout = () => {
        toast((t) => (
            <span className="flex flex-col items-center gap-2">
                Are you sure you want to logout?
                <div className="flex gap-4">
                    <button onClick={() => { toast.dismiss(t.id); localStorage.clear(); navigate("/login"); }}
                        className="bg-red-500 text-white px-3 py-1 rounded-md text-sm">
                        Yes
                    </button>
                    <button onClick={() => toast.dismiss(t.id)}
                        className="bg-gray-300 text-black px-3 py-1 rounded-md text-sm">
                        No
                    </button>
                </div>
            </span>
        ), { duration: 6000 });
    };

    if (isLoading) return (
        <div className="min-h-screen bg-gradient-to-br from-red-300 to-blue-300 py-12 px-6">
            <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
                <SkeletonLoader />
            </div>
        </div>
    );
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 font-semibold">Error: {error}</div>;

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-red-300 to-blue-300 py-12 px-6">
                <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">Approving Authority Dashboard</h1>
                        <button onClick={handleLogout} className="btn btn-danger">
                            Logout
                        </button>
                    </div>

                    <div className="mb-8 flex flex-wrap justify-center gap-4">
                        <button onClick={() => setAddBearerFormVisible(!isAddBearerFormVisible)}
                            className="btn btn-primary inline-flex items-center justify-center gap-2">
                            {isAddBearerFormVisible ? 'Hide Add Form' : 'Add Office Bearer'}
                        </button>
                        {/* --- NEW --- */}
                        <button onClick={() => setDeleteBearerFormVisible(!isDeleteBearerFormVisible)}
                            className="btn btn-danger inline-flex items-center justify-center gap-2">
                            {isDeleteBearerFormVisible ? 'Hide Delete Form' : 'Delete Office Bearer'}
                        </button>
                        <button onClick={openTransferModal}
                            className="btn bg-green-600 text-white hover:bg-green-700 inline-flex items-center justify-center gap-2">
                            <ArrowRightCircle size={20} />
                            Transfer Grievance
                        </button>
                    </div>

                    {isAddBearerFormVisible && (
                        <form onSubmit={handleAddOfficeBearerSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow mt-4 text-left animate-enter">
                            <h2 className="text-xl font-semibold text-gray-800 text-center">New Office Bearer Details</h2>
                            <input type="text" name="name" placeholder="Name" value={newOfficeBearer.name} onChange={handleAddOfficeBearerChange} className="w-full p-2 border rounded" required />
                            <input type="email" name="email" placeholder="Email" value={newOfficeBearer.email} onChange={handleAddOfficeBearerChange} className="w-full p-2 border rounded" required />
                            <input type="password" name="password" placeholder="Password" value={newOfficeBearer.password} onChange={handleAddOfficeBearerChange} className="w-full p-2 border rounded" required />
                            <input type="tel" name="mobile_number" placeholder="Mobile Number" value={newOfficeBearer.mobile_number} onChange={handleAddOfficeBearerChange} className="w-full p-2 border rounded" required />
                            <select name="department" value={newOfficeBearer.department} onChange={handleAddOfficeBearerChange} className="w-full p-2 border rounded" required>
                                <option value="">Select Department</option>
                                {departments.map((dept) => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}
                            </select>
                            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Add Office Bearer</button>
                        </form>
                    )}

                    { }
                    {isDeleteBearerFormVisible && (
                        <form onSubmit={handleDeleteOfficeBearer} className="space-y-4 bg-white p-6 rounded-lg shadow mt-4 text-left animate-enter">
                            <h2 className="text-xl font-semibold text-gray-800 text-center">Delete Office Bearer</h2>
                            <select value={bearerToDelete} onChange={(e) => setBearerToDelete(e.target.value)} className="w-full p-2 border rounded" required>
                                <option value="">Select Office Bearer to Delete</option>
                                {officeBearers.map((bearer) => (
                                    <option key={bearer.id} value={bearer.id}>
                                        {bearer.name} ({bearer.email}) - {bearer.department}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Delete Office Bearer</button>
                        </form>
                    )}


                    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold text-gray-800">Escalated Grievances (Level 1)</h2>
                            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-blue-600 font-semibold">
                                <Filter size={18} />
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </button>
                        </div>
                        {showFilters && (
                            <div className="mb-4">
                                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="p-2 border rounded-lg w-full md:w-auto">
                                    <option value="">Filter by Department</option>
                                    {departments.map(dept => (<option key={dept.id} value={dept.name}>{dept.name}</option>))}
                                </select>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-gray-200 text-gray-700">
                                    <tr>
                                        {['ticket_id', 'title', 'department_name', 'escalation_level', 'created_at'].map(key => (
                                            <th key={key} className="py-3 px-4 cursor-pointer" onClick={() => requestSort(key)}>
                                                <div className="flex items-center gap-1">{key.replace(/_/g, ' ').toUpperCase()}{getSortIcon(key)}</div>
                                            </th>
                                        ))}
                                        <th className="py-3 px-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedGrievances.map((g) => (
                                        <tr key={g.ticket_id} className="border-t hover:bg-gray-50">
                                            <td className="py-3 px-4 font-mono text-sm">{g.ticket_id}</td>
                                            <td className="py-3 px-4">{g.title}</td>
                                            <td className="py-3 px-4">{g.department_name}</td>
                                            <td className="py-3 px-4 text-center font-bold text-red-600">{g.escalation_level}</td>
                                            <td className="py-3 px-4">{new Date(g.created_at).toLocaleDateString()}</td>
                                            <td className="py-3 px-4">
                                                <button onClick={() => openRevertModal(g)} className="btn btn-primary text-sm py-1">Revert</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isRevertModalOpen}
                onClose={() => setRevertModalOpen(false)}
                title="Revert Grievance"
                icon={<MessageSquare size={24} className="text-blue-600" />}
            >
                <form onSubmit={handleRevertSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Resolution Deadline (Days)</label>
                        <input type="number" name="days" placeholder="e.g., 3" value={revertFormData.days}
                            onChange={handleRevertFormChange} className="w-full p-2 border rounded-lg mt-1" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Comment</label>
                        <textarea name="comment" placeholder="Provide a reason for reverting..." value={revertFormData.comment}
                            onChange={handleRevertFormChange} className="w-full p-2 border rounded-lg mt-1" rows="3" required />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold">
                        Confirm Revert
                    </button>
                </form>
            </Modal>

            <Modal
                isOpen={isTransferModalOpen}
                onClose={() => setTransferModalOpen(false)}
                title="Transfer Grievance"
                icon={<ArrowRightCircle size={24} className="text-green-600" />}
            >
                <form onSubmit={handleTransferSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ticket ID</label>
                        <input type="text" name="ticketId" placeholder="e.g., lnm/2025/07/0100" value={transferFormData.ticketId}
                            onChange={handleTransferFormChange} className="w-full p-2 border rounded-lg mt-1" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Department</label>
                        <select name="newDepartmentId" value={transferFormData.newDepartmentId}
                            onChange={handleTransferFormChange} className="w-full p-2 border rounded-lg mt-1" required>
                            <option value="">Select a Department</option>
                            {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold">
                        Confirm Transfer
                    </button>
                </form>
            </Modal>
        </>
    );
}