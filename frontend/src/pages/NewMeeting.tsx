import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import {
  Calendar,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Check,
} from 'lucide-react';

interface TranscriptLineInput {
  timestamp: string;
  speaker: string;
  text: string;
}

export const NewMeeting: React.FC = () => {
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState('');
  
  // Dynamic transcript lines state
  const [transcript, setTranscript] = useState<TranscriptLineInput[]>([
    { timestamp: '', speaker: '', text: '' },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Participant tags management
  const handleAddParticipant = () => {
    const email = participantInput.trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (participants.includes(email)) {
      setError('Participant email is already added.');
      return;
    }

    setParticipants([...participants, email]);
    setParticipantInput('');
    setError(null);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleParticipantKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddParticipant();
    }
  };

  // Transcript lines management
  const handleAddLine = () => {
    // Default the timestamp to the meeting date if set
    const defaultTime = meetingDate || new Date().toISOString().slice(0, 16);
    setTranscript([...transcript, { timestamp: defaultTime, speaker: '', text: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (transcript.length === 1) {
      setError('Transcript must have at least one line.');
      return;
    }
    setTranscript(transcript.filter((_, i) => i !== index));
    setError(null);
  };

  const handleLineChange = (index: number, field: keyof TranscriptLineInput, value: string) => {
    const newLines = [...transcript];
    newLines[index] = { ...newLines[index], [field]: value };
    setTranscript(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title) return setError('Title is required.');
    if (!meetingDate) return setError('Meeting date is required.');
    if (participants.length === 0) return setError('At least one participant is required.');

    // Validate transcript lines
    for (let i = 0; i < transcript.length; i++) {
      const line = transcript[i];
      if (!line.speaker.trim()) return setError(`Speaker name is missing on line ${i + 1}.`);
      if (!line.timestamp) return setError(`Timestamp is missing on line ${i + 1}.`);
      if (!line.text.trim()) return setError(`Transcript text is missing on line ${i + 1}.`);
    }

    setSubmitting(true);
    try {
      // Build API request payload
      const payload = {
        title,
        participants,
        meetingDate: new Date(meetingDate).toISOString(),
        transcript: transcript.map((line) => ({
          ...line,
          timestamp: new Date(line.timestamp).toISOString(),
        })),
      };

      const response = await api.post('/api/v1/meetings', payload);
      if (response.data?.success) {
        navigate(`/meetings/${response.data.data.id}`);
      } else {
        setError(response.data?.error?.message || 'Failed to create meeting');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header link back */}
      <div className="flex items-center gap-2">
        <Link
          to="/meetings"
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Meetings
        </Link>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100/50 p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="border-b border-slate-100 pb-5">
            <h3 className="text-xl font-bold font-display text-slate-800">Create New Meeting</h3>
            <p className="text-xs text-slate-500 mt-1">Specify meeting details and paste transcript lines.</p>
          </div>

          {error && (
            <div className="flex gap-2.5 items-start p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Form grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Meeting Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm outline-none transition-colors duration-150"
                  placeholder="Sprint Planning / Q3 Review"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Meeting Date & Time
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    type="datetime-local"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm outline-none transition-colors duration-150"
                  />
                </div>
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Participants
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1 rounded-lg shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      value={participantInput}
                      onChange={(e) => setParticipantInput(e.target.value)}
                      onKeyDown={handleParticipantKeyDown}
                      className="block w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm outline-none transition-colors duration-150"
                      placeholder="Enter participant email..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Tags container */}
                <div className="flex flex-wrap gap-2 p-3 min-h-[50px] border border-slate-100 bg-slate-50 rounded-xl">
                  {participants.length === 0 ? (
                    <span className="text-xs text-slate-400 font-medium my-auto pl-1">No participants added yet.</span>
                  ) : (
                    participants.map((email, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-sm"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Transcript Sections */}
          <div className="border-t border-slate-100 pt-8 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Transcript Timeline
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                <Plus size={14} />
                Add line
              </button>
            </div>

            <div className="space-y-3">
              {transcript.map((line, idx) => (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl"
                >
                  {/* Speaker */}
                  <div className="w-full md:w-1/4">
                    <input
                      type="text"
                      required
                      value={line.speaker}
                      onChange={(e) => handleLineChange(idx, 'speaker', e.target.value)}
                      placeholder="Speaker (e.g. Alice)"
                      className="block w-full rounded-lg border border-slate-200 py-1.5 px-3 text-slate-900 bg-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs outline-none transition-colors duration-150"
                    />
                  </div>

                  {/* Timestamp */}
                  <div className="w-full md:w-1/4 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                      <Clock className="h-3 w-3 text-slate-400" />
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={line.timestamp}
                      onChange={(e) => handleLineChange(idx, 'timestamp', e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2.5 text-slate-900 bg-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs outline-none transition-colors duration-150"
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      value={line.text}
                      onChange={(e) => handleLineChange(idx, 'text', e.target.value)}
                      placeholder="Transcript text speech..."
                      className="block w-full rounded-lg border border-slate-200 py-1.5 px-3 text-slate-900 bg-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs outline-none transition-colors duration-150"
                    />
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    className="self-end md:self-auto p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={() => navigate('/meetings')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-sm shadow-indigo-100 cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Meeting'}
              {!submitting && <Check size={14} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default NewMeeting;
