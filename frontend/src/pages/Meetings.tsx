import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Video,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const Meetings: React.FC = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const limit = 6;

  // Query paginated meetings list
  const { data: response, isLoading } = useQuery({
    queryKey: ['meetings-list', page, status],
    queryFn: () => {
      let url = `/api/v1/meetings?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      return api.get(url);
    },
  });

  const meetings = response?.data?.data?.data || [];
  const totalPages = response?.data?.data?.totalPages || 1;

  const handlePrev = () => setPage((old) => Math.max(old - 1, 1));
  const handleNext = () => setPage((old) => Math.min(old + 1, totalPages));

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm shadow-slate-100/50">
        <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold">
          <Filter size={16} className="text-slate-400" />
          Filter Meetings
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Grid of Meetings */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-2xl h-44"></div>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Video size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 font-display">No meetings found</h3>
          <p className="text-xs text-slate-500 mt-1">Try changing your filters or create a new meeting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting: any) => (
            <Link
              key={meeting.id}
              to={`/meetings/${meeting.id}`}
              className="flex flex-col bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm hover:shadow-md hover:shadow-indigo-50/30 p-6 transition-all duration-200 group"
            >
              <div className="flex-1">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    meeting.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : meeting.status === 'CANCELLED'
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  }`}
                >
                  {meeting.status}
                </span>
                <h4 className="font-bold text-slate-800 text-base mt-3 line-clamp-2 group-hover:text-indigo-600 transition-colors duration-150 font-display">
                  {meeting.title}
                </h4>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 mt-5 pt-4">
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Calendar size={13} className="text-slate-400" />
                  {new Date(meeting.meetingDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Users size={13} className="text-slate-400" />
                  {meeting.participants.length} participants
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm">
          <button
            onClick={handlePrev}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
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
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
export default Meetings;
