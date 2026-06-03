import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import {
  Filter,
  User,
  Clock,
  Video,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  Quote,
} from 'lucide-react';

export const ActionItems: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [assignee, setAssignee] = useState<string>('');
  const [assigneeInput, setAssigneeInput] = useState<string>('');
  const limit = 10;

  // 1. Fetch action items with filters
  const { data: response, isLoading } = useQuery({
    queryKey: ['action-items-list', page, status, assignee],
    queryFn: () => {
      let url = `/api/v1/action-items?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      if (assignee) url += `&assignee=${encodeURIComponent(assignee)}`;
      return api.get(url);
    },
  });

  // 2. Mutation to update action item status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/action-items/${id}/status`, { status }),
    onSuccess: () => {
      // Invalidate queries to refresh list & dashboard counts
      void queryClient.invalidateQueries({ queryKey: ['action-items-list'] });
      void queryClient.invalidateQueries({ queryKey: ['action-items-pending-count'] });
      void queryClient.invalidateQueries({ queryKey: ['action-items-inprogress-count'] });
      void queryClient.invalidateQueries({ queryKey: ['action-items-overdue'] });
      void queryClient.invalidateQueries({ queryKey: ['meetings-recent'] });
    },
  });

  const actionItems = response?.data?.data?.data || [];
  const totalPages = response?.data?.data?.totalPages || 1;

  const handlePrev = () => setPage((old) => Math.max(old - 1, 1));
  const handleNext = () => setPage((old) => Math.min(old + 1, totalPages));

  const handleApplyAssigneeFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignee(assigneeInput.trim());
    setPage(1);
  };

  const handleResetFilters = () => {
    setStatus('');
    setAssignee('');
    setAssigneeInput('');
    setPage(1);
  };

  const isOverdue = (item: any) => {
    return item.status !== 'COMPLETED' && new Date(item.dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Filtering and search row */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100/50">
        <form onSubmit={handleApplyAssigneeFilter} className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-800 text-sm font-bold font-display self-start md:self-auto">
            <Filter size={16} className="text-slate-400" />
            Filter Tasks
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Select */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg outline-none cursor-pointer transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* Assignee Input */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Search assignee email..."
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                className="block w-full sm:w-56 rounded-lg border border-slate-200 py-1.5 px-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs outline-none transition-colors duration-150 bg-slate-50 hover:bg-slate-100/30 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-100 cursor-pointer transition-colors"
            >
              Apply
            </button>

            {(status || assignee) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Main Table section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100/50 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="animate-pulse bg-slate-100 rounded-lg h-12"></div>
            <div className="animate-pulse bg-slate-100 rounded-lg h-12"></div>
            <div className="animate-pulse bg-slate-100 rounded-lg h-12"></div>
          </div>
        ) : actionItems.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ListTodo size={48} className="text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 font-display">No action items found</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no tasks matching your filters, or no analysis has been generated yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Task Description
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Meeting
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {actionItems.map((item: any) => {
                  const overdue = isOverdue(item);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 transition-colors duration-150 ${
                        overdue ? 'bg-rose-50/15' : ''
                      }`}
                    >
                      {/* Task Info */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className={`text-xs font-bold text-slate-800 ${overdue ? 'text-rose-900' : ''}`}>
                            {item.task}
                          </p>
                          {item.citations && item.citations.length > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold">
                              <Quote size={10} />
                              <span>{item.citations.length} citation(s) available</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          {item.assignee}
                        </span>
                      </td>

                      {/* Meeting Title Link */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                        <Link
                          to={`/meetings/${item.meetingId}`}
                          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          <Video size={13} className="text-indigo-400" />
                          {item.meeting?.title || 'View Meeting'}
                        </Link>
                      </td>

                      {/* Due Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span
                          className={`flex items-center gap-1.5 font-medium ${
                            overdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                          }`}
                        >
                          <Clock size={13} className={overdue ? 'text-rose-500' : 'text-slate-400'} />
                          {new Date(item.dueDate).toLocaleDateString()}
                          {overdue && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                              Overdue
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Inline Status Dropdown */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={item.status}
                          disabled={updateStatusMutation.isPending}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              id: item.id,
                              status: e.target.value,
                            })
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider outline-none border cursor-pointer transition-colors ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50'
                              : item.status === 'IN_PROGRESS'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/50'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50'
                          }`}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginated Footer */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={handlePrev}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer bg-white"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={handleNext}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer bg-white"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionItems;
