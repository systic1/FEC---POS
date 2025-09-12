import React, { useMemo, useState } from 'react';
import { CashDrawerSession, Sale } from '../../types';
import { User } from '../../auth';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { getDiscrepancyAnalysis } from '../../services/geminiService';
import Spinner from '../ui/Spinner';

interface CashDrawerHistoryProps {
  sessions: CashDrawerSession[];
  users: User[];
  sales: Sale[];
}

const CashDrawerHistory: React.FC<CashDrawerHistoryProps> = ({ sessions, users, sales }) => {
  const [detailsSession, setDetailsSession] = useState<CashDrawerSession | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<string | null>(null);

  const getUserName = (userId: string | null) => {
    if (!userId) return 'N/A';
    return users.find(u => u.code === userId)?.name || 'Unknown User';
  };
  
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(b.openingTime).getTime() - new Date(a.openingTime).getTime());
  }, [sessions]);
  
  const handleCloseModal = () => {
    setDetailsSession(null);
    setCurrentAnalysis(null);
  }

  const handleViewDetails = async (session: CashDrawerSession) => {
    setDetailsSession(session);
    
    const hasDiscrepancy = session.closingBalance !== null && 
        (session.discrepancyReason || session.openingBalanceDiscrepancyReason);

    if (hasDiscrepancy) {
        setCurrentAnalysis(null);
        setIsAnalysisLoading(true);

        const salesForSession = sales.filter(sale => {
          const saleDate = new Date(sale.date);
          const openingTime = new Date(session.openingTime);
          const closingTime = session.closingTime ? new Date(session.closingTime) : new Date();
          return sale.paymentMethod === 'Cash' && saleDate >= openingTime && saleDate <= closingTime;
        });

        try {
            const analysis = await getDiscrepancyAnalysis(session, salesForSession);
            setCurrentAnalysis(analysis);
        } catch (error) {
            console.error("Failed to get analysis:", error);
            setCurrentAnalysis("Could not load AI analysis. Please try again.");
        } finally {
            setIsAnalysisLoading(false);
        }
    }
  };


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
                <th scope="col" className="px-6 py-3 text-right">Opening</th>
                <th scope="col" className="px-6 py-3 text-right">Deposits</th>
                <th scope="col" className="px-6 py-3 text-right">Closing</th>
                <th scope="col" className="px-6 py-3 text-right">Discrepancy</th>
                <th scope="col" className="px-6 py-3">Notes & Analysis</th>
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map(session => {
                const sessionSales = sales.filter(sale => {
                    const saleDate = new Date(sale.date);
                    return new Date(session.openingTime) <= saleDate && (session.closingTime ? saleDate <= new Date(session.closingTime) : true);
                });
                const totalCashSales = sessionSales
                    .filter(sale => sale.paymentMethod === 'Cash')
                    .reduce((sum, sale) => sum + sale.total, 0);
                
                const totalDeposits = session.deposits?.reduce((sum, d) => sum + d.amount, 0) || 0;
                const expectedBalance = session.openingBalance + totalCashSales - totalDeposits;
                const discrepancy = session.closingBalance !== null ? session.closingBalance - expectedBalance : null;
                 
                 let discrepancyColor = 'text-gray-900';
                 if (discrepancy !== null) {
                     if (discrepancy > 0.01) discrepancyColor = 'text-green-600';
                     if (discrepancy < -0.01) discrepancyColor = 'text-red-600';
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
                    <td className="px-6 py-4 text-right">₹{session.openingBalance.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right">₹{totalDeposits.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right">
                        {session.closingBalance !== null ? `₹${session.closingBalance.toLocaleString('en-IN')}` : 'N/A'}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${discrepancyColor}`}>
                        {discrepancy !== null ? `₹${discrepancy.toLocaleString('en-IN')}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {(session.discrepancyReason || session.openingBalanceDiscrepancyReason || session.deposits?.length) && (
                        <Button size="sm" variant="secondary" onClick={() => handleViewDetails(session)}>
                          View
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
        <Modal isOpen={true} onClose={handleCloseModal} title="Session Details & Analysis">
            <div className="space-y-4">
                {detailsSession.discrepancyReason && (
                    <div>
                        <h4 className="font-semibold text-gray-700">Note on Closing Discrepancy:</h4>
                        <p className="p-2 bg-gray-100 rounded-md mt-1 whitespace-pre-wrap">{detailsSession.discrepancyReason}</p>
                    </div>
                )}
                 {detailsSession.openingBalanceDiscrepancyReason && (
                     <div>
                        <h4 className="font-semibold text-gray-700">Note on Opening Balance:</h4>
                        <p className="p-2 bg-gray-100 rounded-md mt-1 whitespace-pre-wrap">{detailsSession.openingBalanceDiscrepancyReason}</p>
                    </div>
                )}
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
                {detailsSession.deposits && detailsSession.deposits.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-700">Cash Deposits Made:</h4>
                        <ul className="list-disc list-inside mt-1 space-y-1 text-sm bg-gray-100 p-2 rounded-md">
                            {detailsSession.deposits.map(deposit => (
                                <li key={deposit.id}>
                                    ₹{deposit.amount.toLocaleString()} by {getUserName(deposit.userId)} on {new Date(deposit.timestamp).toLocaleDateString()}
                                    {deposit.notes && <p className="pl-5 text-xs text-gray-500 italic">Note: {deposit.notes}</p>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <hr />
                 <div>
                    <h4 className="font-semibold text-gray-700">AI Auditor Analysis:</h4>
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg mt-1 min-h-[60px]">
                        {isAnalysisLoading ? (
                            <div className="flex items-center gap-2 text-sm text-blue-800">
                                <Spinner />
                                <span>Analyzing...</span>
                            </div>
                        ) : (
                            <p className="text-sm text-blue-800">{currentAnalysis || 'No analysis available for this session.'}</p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
      )}

    </div>
  );
};

export default CashDrawerHistory;