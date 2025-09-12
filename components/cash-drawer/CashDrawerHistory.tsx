import React, { useMemo, useState } from 'react';
import { CashDrawerSession } from '../../types';
import { User } from '../../auth';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface CashDrawerHistoryProps {
  sessions: CashDrawerSession[];
  users: User[];
}

const CashDrawerHistory: React.FC<CashDrawerHistoryProps> = ({ sessions, users }) => {
  const [detailsSession, setDetailsSession] = useState<CashDrawerSession | null>(null);

  const getUserName = (userId: string | null) => {
    if (!userId) return 'N/A';
    return users.find(u => u.code === userId)?.name || 'Unknown User';
  };
  
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(b.openingTime).getTime() - new Date(a.openingTime).getTime());
  }, [sessions]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Cash Drawer History</h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Opened By</th>
                <th scope="col" className="px-6 py-3">Closed By</th>
                <th scope="col" className="px-6 py-3 text-right">Opening Balance</th>
                <th scope="col" className="px-6 py-3 text-right">Closing Balance</th>
                <th scope="col" className="px-6 py-3 text-right">Discrepancy</th>
                <th scope="col" className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map(session => {
                 const discrepancy = session.closingBalance !== null ? session.closingBalance - session.openingBalance : null; // Simplified for now
                 
                 let discrepancyColor = 'text-gray-900';
                 if (discrepancy !== null) {
                     if (discrepancy > 0) discrepancyColor = 'text-green-600';
                     if (discrepancy < 0) discrepancyColor = 'text-red-600';
                 }

                return (
                  <tr key={session.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                        {new Date(session.openingTime).toLocaleDateString()}
                        <span className="block text-xs text-gray-500">
                            {new Date(session.openingTime).toLocaleTimeString()} - {session.closingTime ? new Date(session.closingTime).toLocaleTimeString() : 'Current'}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        {session.status === 'OPEN' ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Open
                            </span>
                        ) : (
                             <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                Closed
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4">{getUserName(session.openedByUserId)}</td>
                    <td className="px-6 py-4">{getUserName(session.closedByUserId)}</td>
                    <td className="px-6 py-4 text-right">₹{session.openingBalance.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right">
                        {session.closingBalance !== null ? `₹${session.closingBalance.toLocaleString('en-IN')}` : 'N/A'}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${discrepancyColor}`}>
                        {discrepancy !== null ? `₹${discrepancy.toLocaleString('en-IN')}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {session.discrepancyReason && (
                        <Button size="sm" variant="secondary" onClick={() => setDetailsSession(session)}>
                          View Note
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
               {sortedSessions.length === 0 && (
                  <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-500">No cash drawer sessions found.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {detailsSession && (
        <Modal isOpen={true} onClose={() => setDetailsSession(null)} title="Discrepancy Note">
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-gray-700">Reason Provided:</h4>
                    <p className="p-2 bg-gray-100 rounded-md mt-1 whitespace-pre-wrap">{detailsSession.discrepancyReason}</p>
                </div>
                {detailsSession.discrepancyAttachment && (
                     <div>
                        <h4 className="font-semibold text-gray-700">Attachment:</h4>
                        <a 
                            href={detailsSession.discrepancyAttachment.data} 
                            download={detailsSession.discrepancyAttachment.name}
                            className="text-blue-600 hover:underline mt-1 block"
                        >
                            Download {detailsSession.discrepancyAttachment.name}
                        </a>
                    </div>
                )}
            </div>
        </Modal>
      )}

    </div>
  );
};

export default CashDrawerHistory;