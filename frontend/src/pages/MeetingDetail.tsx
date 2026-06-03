import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import {
  Calendar,
  Users,
  AlertCircle,
  Brain,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Clock,
  User,
  Quote,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';

export const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'actionItems' | 'decisions' | 'followups'>('transcript');
  const [hoveredCitationLineId, setHoveredCitationLineId] = useState<string | null>(null);

  // 1. Fetch meeting with transcript lines
  const { data: meetingRes, isLoading } = useQuery({
    queryKey: ['meeting-detail', id],
    queryFn: () => api.get(`/api/v1/meetings/${id}`),
    enabled: !!id,
  });

  // 2. Fetch meeting analysis
  const { data: analysisRes } = useQuery({
    queryKey: ['meeting-analysis', id],
    queryFn: () => api.get(`/api/v1/meetings/${id}/analysis`).catch(() => null), // Fail gracefully if not analyzed
    enabled: !!id,
  });

  // 3. Trigger Analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/meetings/${id}/analyze`),
    onSuccess: () => {
      // Refresh both meeting detail and analysis
      void queryClient.invalidateQueries({ queryKey: ['meeting-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['meeting-analysis', id] });
      void queryClient.invalidateQueries({ queryKey: ['action-items-pending-count'] });
      void queryClient.invalidateQueries({ queryKey: ['action-items-overdue'] });
      setActiveTab('summary');
    },
  });

  const meeting = meetingRes?.data?.data;
  const analysis = analysisRes?.data?.data || meeting?.analysis; // Fallback to nested analysis if present
  const transcriptLines = meeting?.transcriptLines || [];
  const actionItems = meeting?.actionItems || [];

  if (isLoading) {
    return <div className="animate-pulse bg-white border border-slate-200 rounded-2xl h-96"></div>;
  }

  if (!meeting) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
        <AlertCircle size={48} className="text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700 font-display">Meeting not found</h3>
        <Link to="/meetings" className="text-xs font-semibold text-indigo-600 hover:underline mt-2 inline-block">
          Return to meetings list
        </Link>
      </div>
    );
  }

  // Parse JSON features of the analysis
  const parsedSummary = typeof analysis?.summary === 'string' ? JSON.parse(analysis.summary) : analysis?.summary;
  const parsedDecisions = typeof analysis?.decisions === 'string' ? JSON.parse(analysis.decisions) : analysis?.decisions || [];
  const parsedFollowups = typeof analysis?.followups === 'string' ? JSON.parse(analysis.followups) : analysis?.followups || [];

  return (
    <div className="space-y-6">
      {/* Header and metadata */}
      <div className="flex items-center gap-2">
        <Link to="/meetings" className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={14} />
          Back to Meetings
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row items-start justify-between gap-6 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
        <div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
            {meeting.status}
          </span>
          <h2 className="text-2xl font-extrabold text-slate-800 mt-3 font-display">{meeting.title}</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3">
            <span className="flex items-center gap-1">
              <Calendar size={14} className="text-slate-400" />
              {new Date(meeting.meetingDate).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Users size={14} className="text-slate-400" />
              {meeting.participants.length} participants
            </span>
          </div>
        </div>

        {/* Action Button */}
        {!analysis ? (
          <button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="flex items-center gap-1.5 px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-sm shadow-indigo-100 transition-all cursor-pointer"
          >
            <Sparkles size={16} />
            {analyzeMutation.isPending ? 'Analyzing transcript...' : 'Run AI Analysis'}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-lg text-xs font-bold">
            <CheckCircle2 size={16} />
            AI Analysis Available
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('transcript')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
            activeTab === 'transcript' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Transcript ({transcriptLines.length})
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          disabled={!analysis}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
            !analysis ? 'opacity-40 cursor-not-allowed' : ''
          } ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab('actionItems')}
          disabled={!analysis}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
            !analysis ? 'opacity-40 cursor-not-allowed' : ''
          } ${activeTab === 'actionItems' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Action Items ({actionItems.length})
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          disabled={!analysis}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
            !analysis ? 'opacity-40 cursor-not-allowed' : ''
          } ${activeTab === 'decisions' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Decisions ({parsedDecisions.length})
        </button>
        <button
          onClick={() => setActiveTab('followups')}
          disabled={!analysis}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
            !analysis ? 'opacity-40 cursor-not-allowed' : ''
          } ${activeTab === 'followups' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Follow-ups ({parsedFollowups.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
        
        {/* PANEL: Transcript */}
        {activeTab === 'transcript' && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-1.5 text-slate-800 font-bold font-display text-sm">
              <MessageSquare size={16} className="text-slate-400" />
              Chronological Meeting Transcript
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {transcriptLines.map((line: any) => (
                <div
                  key={line.id}
                  id={`line-${line.id}`}
                  className={`p-4 rounded-xl transition-all duration-300 ${
                    hoveredCitationLineId === line.id
                      ? 'bg-amber-50/80 border border-amber-200/60 shadow-sm scale-[1.01]'
                      : 'bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <User size={13} className="text-slate-400" />
                      {line.speaker}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={11} />
                      {new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2 pl-4 border-l-2 border-slate-200">
                    {line.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL: Summary */}
        {activeTab === 'summary' && analysis && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-1.5 text-indigo-700 font-bold font-display text-sm">
              <Brain size={16} />
              AI Meeting Summary & Insights
            </div>
            
            <div className="p-5 bg-indigo-50/20 border border-indigo-100/50 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Overview Summary</h4>
              <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
                {parsedSummary?.text || 'No overview summary available.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-slate-50 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Topics Discussed</h4>
                <div className="flex flex-wrap gap-2 mt-3">
                  {parsedSummary?.topics?.map((topic: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-600">
                      {topic}
                    </span>
                  )) || <span className="text-xs text-slate-400">None detected.</span>}
                </div>
              </div>
              
              <div className="p-5 bg-slate-50 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Sentiment Analysis</h4>
                <p className="text-xs font-semibold capitalize text-indigo-600 mt-3 font-display">
                  {parsedSummary?.sentiment || 'Neutral'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PANEL: Action Items */}
        {activeTab === 'actionItems' && analysis && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-1.5 text-slate-800 font-bold font-display text-sm">
              <ListTodo size={16} className="text-slate-400" />
              Extracted Action Items
            </div>
            
            <div className="space-y-5">
              {actionItems.length === 0 ? (
                <p className="text-xs text-slate-400">No action items extracted for this meeting.</p>
              ) : (
                actionItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-200 text-slate-700">
                          {item.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{item.task}</p>
                      
                      {/* Citations section */}
                      {item.citations && item.citations.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Quote size={12} />
                            Source Citations
                          </p>
                          <div className="space-y-2 pl-3 border-l-2 border-indigo-200">
                            {item.citations.map((cite: any, i: number) => (
                              <div
                                key={i}
                                onMouseEnter={() => setHoveredCitationLineId(cite.lineId)}
                                onMouseLeave={() => setHoveredCitationLineId(null)}
                                onClick={() => {
                                  const el = document.getElementById(`line-${cite.lineId}`);
                                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                                className="text-[10px] text-slate-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-100 p-2.5 rounded-lg cursor-pointer transition-all duration-150 max-w-xl shadow-xs"
                              >
                                &ldquo;{cite.text}&rdquo;
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-600 self-start md:self-auto shrink-0 shadow-xs">
                      <User size={12} className="text-slate-400" />
                      {item.assignee}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PANEL: Decisions */}
        {activeTab === 'decisions' && analysis && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-1.5 text-slate-800 font-bold font-display text-sm">
              <CheckCircle2 size={16} className="text-slate-400" />
              Decisions Logged
            </div>
            
            <div className="space-y-4">
              {parsedDecisions.length === 0 ? (
                <p className="text-xs text-slate-400">No key decisions extracted from this meeting.</p>
              ) : (
                parsedDecisions.map((decision: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">&bull; {decision.decision}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2 pl-3">
                      <span>Made by: <strong>{decision.madeBy}</strong></span>
                      {decision.timestamp && (
                        <span>at {new Date(decision.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PANEL: Follow-ups */}
        {activeTab === 'followups' && analysis && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-1.5 text-slate-800 font-bold font-display text-sm">
              <Clock size={16} className="text-slate-400" />
              Follow-ups & Next Steps
            </div>
            
            <div className="space-y-4">
              {parsedFollowups.length === 0 ? (
                <p className="text-xs text-slate-400">No follow-up items recorded.</p>
              ) : (
                parsedFollowups.map((followup: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{followup.topic}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Owner: {followup.owner}</p>
                    </div>
                    {followup.deadline && (
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                        Deadline: {new Date(followup.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default MeetingDetail;
