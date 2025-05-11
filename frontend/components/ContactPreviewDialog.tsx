import React from 'react';

interface ContactPreviewDialogProps {
  data: any[];
  onClose: () => void;
  onConfirm: () => void;
}

const ContactPreviewDialog: React.FC<ContactPreviewDialogProps> = ({
  data,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Review Contacts Before Sending</h3>
        <div className="max-h-[70vh] overflow-y-auto mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {data[0] && Object.keys(data[0]).map((header) => (
                  <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {Object.values(row).map((value: any, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center bg-red-50 hover:bg-red-100 border-2 border-red-500 rounded-lg transition-colors"
          >
            <span className="text-2xl text-red-600">✕</span>
          </button>
          <button
            onClick={onConfirm}
            className="w-12 h-12 flex items-center justify-center bg-green-50 hover:bg-green-100 border-2 border-green-500 rounded-lg transition-colors"
          >
            <span className="text-2xl text-green-600">➣</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactPreviewDialog; 