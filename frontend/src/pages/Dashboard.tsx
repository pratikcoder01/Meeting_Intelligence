import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';
import {
  Video,
  ListTodo,
  AlertCircle,
  ArrowRight,
  Calendar,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  // 1. Fetch recent meetings and total meetings count
  const { data: meetingsRes, isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings-recent'],
    queryFn: () => api.get('/api/v1/meetings?limit=5'),
  });

  // 2. Fetch pending action items count
  const { data: pendingActionItemsRes } = useQuery({
    queryKey: ['action-items-pending-count'],
    queryFn: () => api.get('/api/v1/action-items?status=PENDING&limit=1'),
  });

  // 3. Fetch in-progress action items count
  const { data: inProgressActionItemsRes } = useQuery({
    queryKey: ['action-items-inprogress-count'],
    queryFn: () => api.get('/api/v1/action-items?status=IN_PROGRESS&limit=1'),
  });

  // 4. Fetch overdue action items
  const { data: overdueRes, isLoading: overdueLoading } = useQuery({
    queryKey: ['action-items-overdue'],
    queryFn: () => api.get('/api/v1/action-items/overdue'),
  });

  const totalMeetings = meetingsRes?.data?.data?.total || 0;
  const recentMeetings = meetingsRes?.data?.data?.data || [];
  
  const pendingCount = pendingActionItemsRes?.data?.data?.total || 0;
  const inProgressCount = inProgressActionItemsRes?.data?.data?.total || 0;
  const openActionItemsCount = pendingCount + inProgressCount;
  
  const overdueItems = overdueRes?.data?.data || [];
  const overdueCount = overdueItems.length;

  const stats = [
    {
      label: 'Total Meetings',
      value: totalMeetings,
      icon: Video,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Open Action Items',
      value: openActionItemsCount,
      icon: ListTodo,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Overdue Items',
      value: overdueCount,
      icon: AlertCircle,
      color: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-indigo-900 to-indigo-850 rounded-2xl text-white shadow-sm shadow-indigo-100">
        <div>
          <h2 className="text-xl font-bold font-display">Welcome to Meeting Intelligence</h2>
          <p className="text-xs text-indigo-200 mt-1">Review meeting analytics, transcripts, and track project action items.</p>
        </div>
        <Link
          to="/meetings/new"
          className="self-start md:self-auto flex items-center gap-1.5 px-4 py-2.5 bg-white text-indigo-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-all duration-150 shadow-sm"
        >
          New Meeting
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-5 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100/50"
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1 font-display">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main dashboard content grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Meetings */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100/50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 font-display">Recent Meetings</h3>
            <Link
              to="/meetings"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex-1 p-6 space-y-4">
            {meetingsLoading ? (
              <p className="text-xs text-slate-400">Loading meetings...</p>
            ) : recentMeetings.length === 0 ? (
              <div className="text-center py-8">
                <Video size={36} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No meetings created yet.</p>
              </div>
            ) : (
              recentMeetings.map((meeting: any) => (
                <Link
                  key={meeting.id}
                  to={`/meetings/${meeting.id}`}
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition-all duration-200 group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                      {meeting.title}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(meeting.meetingDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {meeting.participants.length} participants
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      meeting.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : meeting.status === 'CANCELLED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}
                  >
                    {meeting.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Overdue Items */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100/50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 font-display">Overdue Action Items</h3>
            <Link
              to="/action-items"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Manage all
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex-1 p-6 space-y-4">
            {overdueLoading ? (
              <p className="text-xs text-slate-400">Loading overdue items...</p>
            ) : overdueItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 size={36} className="text-emerald-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">All caught up! No overdue action items.</p>
              </div>
            ) : (
              overdueItems.slice(0, 5).map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 border border-rose-100 bg-rose-50/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">{item.task}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1.5">
                      <span className="font-semibold text-rose-600">
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                      <span>Assignee: {item.assignee}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                    {item.meeting?.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
