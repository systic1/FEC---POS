import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Customer } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import WaiverForm from './WaiverForm';
import Button from './ui/Button';
import QRCode from 'qrcode';

type Participant = Partial<Customer> & {
    tempId: number;
    status: 'editing' | 'completed';
};

const WaiverPortal: React.FC = () => {
  const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', []);
  const [session, setSession] = useState<{
    groupId: string;
    participants: Participant[];
    isFinished: boolean;
  } | null>(null);

  const [activeParticipantId, setActiveParticipantId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const startSession = useCallback(() => {
    const groupId = `JMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const initialParticipant: Participant = {
        tempId: 0,
        status: 'editing',
        name: '',
        dob: '',
        email: '',
        phone: '',
    };
    setSession({
        groupId,
        participants: [initialParticipant],
        isFinished: false,
    });
    setActiveParticipantId(0);
  }, []);

  const addParticipant = () => {
    if (!session) return;
    const nextId = session.participants.length > 0 ? Math.max(...session.participants.map(p => p.tempId)) + 1 : 0;
    const newParticipant: Participant = {
        tempId: nextId,
        status: 'editing',
    };
    setSession(prev => prev ? { ...prev, participants: [...prev.participants, newParticipant] } : null);
    setActiveParticipantId(nextId);
  };
  
  const handleWaiverSubmit = useCallback((customerData: Omit<Customer, 'id'>) => {
    if (!session || activeParticipantId === null) return;
    setIsSubmitting(true);
    setSession(prev => {
        if (!prev) return null;
        const updatedParticipants = prev.participants.map(p => 
            p.tempId === activeParticipantId 
                ? { ...p, ...customerData, status: 'completed' as const }
                : p
        );
        return { ...prev, participants: updatedParticipants };
    });

    // Automatically switch to the next unsaved participant or add a new one
    const nextParticipant = session.participants.find(p => p.status === 'editing' && p.tempId !== activeParticipantId);
    if(nextParticipant) {
        setActiveParticipantId(nextParticipant.tempId);
    } else {
       // All are filled, do nothing or prompt to add more
    }
    
    setTimeout(() => setIsSubmitting(false), 500);

  }, [session, activeParticipantId]);


  const finishGroupSession = () => {
    if (!session) return;
    
    const newCustomers: Customer[] = session.participants.map(p => ({
        ...p,
        id: `cust_${new Date().getTime()}_${p.tempId}`,
        waiverSignedOn: p.waiverSignedOn || new Date().toISOString(),
        groupId: session.groupId,
        groupWaiverDate: new Date().toISOString(),
    } as Customer));

    // This logic ensures we don't add duplicates if user edits
    const existingIds = new Set(customers.map(c => c.id));
    const customersToAdd = newCustomers.filter(c => !existingIds.has(c.id));
    
    setCustomers(prev => [...prev, ...customersToAdd]);
    setSession(prev => prev ? { ...prev, isFinished: true } : null);
  };
  
  useEffect(() => {
    if (session?.isFinished && session.groupId) {
        QRCode.toDataURL(session.groupId, { width: 256, margin: 2 })
            .then(url => {
                setQrCodeUrl(url);
            })
            .catch(err => {
                console.error("Failed to generate QR code:", err);
            });
    }
  }, [session?.isFinished, session?.groupId]);

  
  const resetSession = () => {
    setSession(null);
    setActiveParticipantId(null);
    setQrCodeUrl('');
  };

  const activeParticipant = useMemo(() => {
    if (!session || activeParticipantId === null) return null;
    return session.participants.find(p => p.tempId === activeParticipantId) || null;
  }, [session, activeParticipantId]);

  const allParticipantsCompleted = useMemo(() => {
    return session?.participants.every(p => p.status === 'completed');
  }, [session]);

  if (!session) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Jump India Fun Zone</h1>
            <p className="text-gray-500 mb-8">Waiver & Registration</p>
            <p className="mb-6">Click below to start signing waivers for yourself and your group.</p>
            <Button size="lg" onClick={startSession}>Start Group Waiver</Button>
        </div>
      </div>
    );
  }
  
  if (session.isFinished) {
     return (
        <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h2 className="text-2xl font-semibold text-gray-800">Group Waivers Submitted!</h2>
                <p className="text-gray-600 mt-2">Your group is all set. Please show this screen at the counter.</p>
                
                {qrCodeUrl && <img src={qrCodeUrl} alt="Group ID QR Code" className="mx-auto my-6 rounded-lg shadow-md" />}

                <div className="my-6 p-4 bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg">
                    <p className="text-sm font-medium text-blue-700">Or provide your Group Code:</p>
                    <p className="text-3xl font-bold text-blue-800 tracking-widest">{session.groupId}</p>
                </div>
                <Button onClick={resetSession}>Sign for Another Group</Button>
            </div>
        </div>
     );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto bg-white rounded-xl shadow-lg flex flex-col md:flex-row">
        {/* Left Nav for participants */}
        <aside className="w-full md:w-1/3 lg:w-1/4 border-b md:border-b-0 md:border-r p-6 bg-gray-50 rounded-t-xl md:rounded-l-xl md:rounded-tr-none">
            <h2 className="text-lg font-bold text-gray-800">Your Group</h2>
            <div className="my-4 p-2 bg-blue-100 border border-blue-200 rounded-md text-center">
                <p className="text-xs font-medium text-blue-600">Group Code</p>
                <p className="font-bold text-blue-800">{session.groupId}</p>
            </div>
            <ul className="space-y-2">
                {session.participants.map((p, index) => (
                    <li key={p.tempId}>
                        <button 
                            onClick={() => setActiveParticipantId(p.tempId)}
                            className={`w-full text-left p-3 rounded-md flex items-center gap-3 transition-colors ${activeParticipantId === p.tempId ? 'bg-blue-200 ring-2 ring-blue-500' : 'hover:bg-gray-200'}`}
                        >
                            {p.status === 'completed' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            )}
                            <span className="font-medium truncate">{p.name || `Participant ${index + 1}`}</span>
                        </button>
                    </li>
                ))}
            </ul>
            <Button onClick={addParticipant} variant="secondary" className="w-full mt-4">Add Participant</Button>
            <div className="mt-6 border-t pt-6">
                <Button onClick={finishGroupSession} disabled={!allParticipantsCompleted} className="w-full">
                    Finish & Submit Group
                </Button>
                {!allParticipantsCompleted && <p className="text-xs text-center text-gray-500 mt-2">All participants must be completed before finishing.</p>}
            </div>
        </aside>

        {/* Right side for the form */}
        <main className="flex-1 p-6 md:p-8">
            {activeParticipant ? (
                <WaiverForm 
                    key={activeParticipant.tempId}
                    onWaiverSubmit={handleWaiverSubmit} 
                    participantData={activeParticipant}
                    allCustomers={customers}
                    isSubmitting={isSubmitting}
                />
            ) : (
                <div className="text-center py-20">
                    <p className="text-gray-500">Select a participant or add a new one to begin.</p>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default WaiverPortal;