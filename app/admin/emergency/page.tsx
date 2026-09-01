'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ShieldCheck,
  FileText,
  Hospital,
  User,
  Activity,
  Sparkles,
  Eye
} from 'lucide-react';

import EmergencyLoan from '@/database/models/EmergencyLoan';

interface ApiResponse {
  success: boolean;
  data: IEmergencyLoan[];
  pagination: {
    current: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    count: number;
    totalCount: number;
  };
  error?: string;
}

export default function EmergencyAdminPage() {
  const [applications, setApplications] = useState<IEmergencyLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    hasNext: false,
    hasPrev: false,
    count: 0,
    totalCount: 0
  });
  const [selectedApplication, setSelectedApplication] = useState<IEmergencyLoan | null>(null);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 3
  }));

  const fetchApplications = async (status = statusFilter, page = currentPage) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status,
        page: page.toString(),
        limit: '10'
      });

      const response = await fetch(`/api/admin/emergency?${params}`);
      const result: ApiResponse = await response.json();

      if (result.success) {
        setApplications(result.data);
        setPagination(result.pagination);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch applications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchApplications(newStatus, 1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchApplications(statusFilter, newPage);
  };

  const updateApplicationStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/emergency', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          loanStatus: status,
          approvalDate: new Date().toISOString(),
          approvedBy: 'Admin'
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchApplications();
      } else {
        alert('Failed to update application status');
      }
    } catch (error) {
      alert('Error updating application status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const openDetailsModal = (application: IEmergencyLoan) => {
    setSelectedApplication(application);
    setActiveModal('details');
  };

  const getVerificationIcon = (status: string) => {
    return status === 'Verified' ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  if (loading) {
    return (
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-[#f8fff8] to-[#f0fff0] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="text-center"
          animate={{
            rotate: 360,
            transition: { duration: 1.5, repeat: Infinity, ease: "linear" }
          }}
        >
          <div className="w-20 h-20 border-4 border-[#7FFF00] border-t-[#1a2332] rounded-full"></div>
          <motion.p 
            className="mt-6 text-black font-medium"
            animate={{
              opacity: [0.6, 1, 0.6],
              transition: { duration: 2, repeat: Infinity }
            }}
          >
            Loading applications...
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fff8] to-[#f0fff0] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute bg-[#7FFF00]/20 rounded-full backdrop-blur-sm"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 6 + particle.id * 0.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-4"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div 
                className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-2xl"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.6 }}
              >
                <div className="relative">
                  <motion.div 
                    className="text-xl font-bold text-white"
                    animate={{ textShadow: ["0 0 0px #7FFF00", "0 0 10px #7FFF00", "0 0 0px #7FFF00"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    S
                  </motion.div>
                  <motion.div 
                    className="absolute -right-1 top-1 w-2 h-2 bg-[#7FFF00] rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                </div>
              </motion.div>
              <div>
                <motion.h1 
                  className="text-3xl font-bold text-black"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Emergency Loan Dashboard
                </motion.h1>
                <motion.p 
                  className="text-black font-medium"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Manage and review emergency loan applications
                </motion.p>
              </div>
            </motion.div>

            <motion.button
              onClick={() => fetchApplications()}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-medium shadow-lg"
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCw className="w-5 h-5" />
              Refresh
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {[
            { title: 'Total Applications', value: pagination.totalCount, icon: <FileText className="w-6 h-6" />, color: 'bg-black' },
            { title: 'Pending', value: applications.filter(a => a.loanStatus === 'Pending').length, icon: <Clock className="w-6 h-6" />, color: 'bg-yellow-500' },
            { title: 'Approved', value: applications.filter(a => a.loanStatus === 'Approved').length, icon: <CheckCircle2 className="w-6 h-6" />, color: 'bg-green-500' },
            { title: 'Rejected', value: applications.filter(a => a.loanStatus === 'Rejected').length, icon: <XCircle className="w-6 h-6" />, color: 'bg-red-500' }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              className={`${stat.color} text-white p-6 rounded-2xl shadow-lg overflow-hidden relative`}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ y: -5 }}
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium opacity-80">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg">
                    {stat.icon}
                  </div>
                </div>
              </div>
              <motion.div 
                className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-white/10"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div 
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-wrap gap-6 items-center">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <Filter className="w-5 h-5 text-black" />
              <label className="text-sm font-medium text-black">Filter by Status:</label>
            </motion.div>
            
            <motion.div className="flex flex-wrap gap-3">
              {['all', 'Pending', 'Approved', 'Rejected'].map((status) => (
                <motion.button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 ${
                    statusFilter === status 
                      ? 'bg-black text-white shadow-md' 
                      : 'bg-white text-black border border-black/20 hover:bg-black/5'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {status === 'all' ? 'All' : (
                    <>
                      {getStatusIcon(status)}
                      {status}
                    </>
                  )}
                </motion.button>
              ))}
            </motion.div>

            <motion.div 
              className="text-sm text-black ml-auto flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                Showing {pagination.count} of {pagination.totalCount} applications
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div 
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        {/* Applications Table */}
        <motion.div 
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-black">
                <tr>
                  {['Applicant', 'Patient & Emergency', 'Hospital', 'Amount', 'Status', 'Date', 'Actions'].map((header) => (
                    <th 
                      key={header}
                      className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {applications.map((app) => (
                    <motion.tr 
                      key={app._id}
                      className="hover:bg-[#f8fff8]"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <motion.div 
                          className="flex items-center gap-3"
                          whileHover={{ x: 5 }}
                        >
                          <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-black" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-black">{app.applicantName}</div>
                            <div className="text-xs text-black/80">Contact: {app.contactNumber}</div>
                          </div>
                        </motion.div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-black flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[#7FFF00]" />
                            {app.patientName}
                          </div>
                          <div className="text-xs text-black/80">{app.emergencyType}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
                            <Hospital className="w-5 h-5 text-black" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-black">{app.hospitalName}</div>
                            <div className="text-xs text-black/80">{app.hospitalLocation}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-black">
                          {formatCurrency(app.loanAmountRequired)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <motion.span 
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(app.loanStatus)}`}
                          whileHover={{ scale: 1.05 }}
                        >
                          {getStatusIcon(app.loanStatus)}
                          <span className="ml-1.5">{app.loanStatus}</span>
                        </motion.span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {formatDate(app.applicationDate.toString())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3 items-center">
                          <motion.button
                            onClick={() => openDetailsModal(app)}
                            className="text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </motion.button>
                          {app.loanStatus === 'Pending' && (
                            <>
                              <motion.button
                                onClick={() => updateApplicationStatus(app._id!, 'Approved')}
                                className="text-green-600 hover:text-green-800 bg-green-50 px-4 py-2 rounded-xl flex items-center gap-2"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Approve
                              </motion.button>
                              <motion.button
                                onClick={() => updateApplicationStatus(app._id!, 'Rejected')}
                                className="text-red-600 hover:text-red-800 bg-red-50 px-4 py-2 rounded-xl flex items-center gap-2"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <XCircle className="w-4 h-4" />
                                Reject
                              </motion.button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Empty State */}
        {applications.length === 0 && !loading && (
          <motion.div 
            className="bg-white rounded-2xl shadow-lg p-12 text-center mt-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="text-black/20 text-8xl mb-6"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              📋
            </motion.div>
            <h3 className="text-2xl font-medium text-black mb-2">No applications found</h3>
            <p className="text-black/80 max-w-md mx-auto">
              {statusFilter !== 'all' 
                ? `No ${statusFilter.toLowerCase()} applications at the moment.`
                : 'No emergency loan applications have been submitted yet.'
              }
            </p>
          </motion.div>
        )}

        {/* Pagination */}
        {pagination.total > 1 && (
          <motion.div 
            className="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-200 mt-6 rounded-b-2xl shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrev}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-black bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </motion.button>
            
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-center">
              <div>
                <p className="text-sm text-black">
                  Showing page <span className="font-medium">{pagination.current}</span> of{' '}
                  <span className="font-medium">{pagination.total}</span>
                </p>
              </div>
            </div>
            
            <motion.button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNext}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-black bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Application Details Modal */}
      <AnimatePresence>
        {activeModal === 'details' && selectedApplication && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#7FFF00] to-[#32CD32] p-6 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-[#7FFF00]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-black">Application Details</h2>
                      <p className="text-black">Complete information for review</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setActiveModal(null)}
                    className="text-black hover:text-black"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <XCircle className="w-6 h-6" />
                  </motion.button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeClass(selectedApplication.loanStatus)}`}>
                      {getStatusIcon(selectedApplication.loanStatus)}
                      <span className="ml-1.5">{selectedApplication.loanStatus}</span>
                    </span>
                    <span className="text-sm text-black">
                      Applied on: {formatDate(selectedApplication.applicationDate.toString())}
                    </span>
                  </div>
                  {selectedApplication.loanStatus === 'Pending' && (
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => {
                          updateApplicationStatus(selectedApplication._id!, 'Approved');
                          setActiveModal(null);
                        }}
                        className="text-green-600 hover:text-green-800 bg-green-50 px-4 py-2 rounded-xl flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          updateApplicationStatus(selectedApplication._id!, 'Rejected');
                          setActiveModal(null);
                        }}
                        className="text-red-600 hover:text-red-800 bg-red-50 px-4 py-2 rounded-xl flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Applicant Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-3">
                    <User className="w-5 h-5 text-black" />
                    Applicant Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-black mb-1">Full Name</p>
                      <p className="font-medium text-black">{selectedApplication.applicantName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Date of Birth</p>
                      <p className="font-medium text-black">{selectedApplication.applicantDob}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Gender</p>
                      <p className="font-medium text-black">{selectedApplication.applicantGender}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Contact Number</p>
                      <p className="font-medium text-black">{selectedApplication.contactNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Aadhaar Number</p>
                      <p className="font-medium text-black">{selectedApplication.applicantAadhaarNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Verification Status</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-black">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-red-500" />
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-black mb-1">Patient Name</p>
                      <p className="font-medium text-black">{selectedApplication.patientName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Emergency Type</p>
                      <p className="font-medium text-black">{selectedApplication.emergencyType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Relationship to Applicant</p>
                      <p className="font-medium text-black">{selectedApplication.relationshipToPatient}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Patient Contact</p>
                      <p className="font-medium text-black">{selectedApplication.contactNumber}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-black mb-1">Emergency Description</p>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-black whitespace-pre-wrap">
                        {selectedApplication.emergencyDescription}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hospital Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-3">
                    <Hospital className="w-5 h-5 text-black" />
                    Hospital Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-black mb-1">Hospital Name</p>
                      <p className="font-medium text-black">{selectedApplication.hospitalName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Location</p>
                      <p className="font-medium text-black">{selectedApplication.hospitalLocation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Verification Status</p>
                      <div className="flex items-center gap-2">
                        {getVerificationIcon(selectedApplication.hospitalVerificationStatus)}
                        <span className="font-medium text-black">
                          {selectedApplication.hospitalVerificationStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loan Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-black" />
                    Loan Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-black mb-1">Amount Requested</p>
                      <p className="font-medium text-black text-2xl">
                        {formatCurrency(selectedApplication.loanAmountRequired)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-black mb-1">Medical Certificate Valid</p>
                      <p className="font-medium text-black">
                        {selectedApplication.medicalCertificateValid ? 'Yes' : 'No'}
                      </p>
                    </div>
                    {selectedApplication.loanStatus !== 'Pending' && (
                      <>
                        <div>
                          <p className="text-sm text-black mb-1">Decision Date</p>
                          <p className="font-medium text-black">
                            {selectedApplication.approvalDate ? formatDate(selectedApplication.approvalDate.toString()) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-black mb-1">Approved By</p>
                          <p className="font-medium text-black">
                            {selectedApplication.approvedBy || 'System'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Medical Certificate */}
                {selectedApplication.medicalCertificateText && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-3">
                      <FileText className="w-5 h-5 text-black" />
                      Medical Certificate Text
                    </h3>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-black whitespace-pre-wrap">
                        {selectedApplication.medicalCertificateText}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                <motion.button
                  onClick={() => setActiveModal(null)}
                  className="bg-black text-white px-6 py-2 rounded-xl font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating AI Assistant */}
      <motion.button
        className="fixed bottom-8 right-8 bg-gradient-to-r from-[#7FFF00] to-[#32CD32] text-black p-4 rounded-full shadow-2xl z-50"
        whileHover={{ scale: 1.1, rotate: 15 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setActiveModal('ai')}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>
    </div>
  );
}