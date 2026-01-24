// client/src/pages/StudentReceipt.jsx
import { useLocation, Link } from "react-router-dom";

export default function StudentReceipt() {
  const { state } = useLocation();
  const { lesson } = state || {}; // Data passed from the payment success redirect

  if (!lesson) return <div className="p-10 text-center">Receipt not found.</div>;

  const isPackage = lesson.isPackage || lesson.packageSize > 1;
  const unitPrice = lesson.price || 0;
  const totalPaid = isPackage ? unitPrice * lesson.packageSize : unitPrice;

  return (
    <div className="max-w-2xl mx-auto p-6 my-10 bg-white border border-slate-200 rounded-3xl shadow-xl font-sans">
      {/* Header */}
      <div className="text-center border-b border-slate-100 pb-8 mb-8">
        <div className="text-indigo-600 font-black text-2xl mb-1 tracking-tighter">LERNITT</div>
        <h1 className="text-xl font-bold text-slate-900">Transaction Receipt</h1>
        <p className="text-slate-500 text-sm mt-1">Transaction ID: {lesson._id?.slice(-8).toUpperCase()}</p>
      </div>

      {/* Item Breakdown */}
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-slate-900 leading-tight">
              {isPackage ? `5-Lesson Bundle: ${lesson.lessonTypeTitle}` : lesson.lessonTypeTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">Tutor: {lesson.tutorName || "Academic Professional"}</p>
          </div>
          <span className="font-black text-slate-900 text-lg">€{totalPaid.toFixed(2)}</span>
        </div>

        {isPackage && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <h3 className="text-emerald-800 text-xs font-black uppercase tracking-widest mb-2">Package Contents</h3>
            <ul className="space-y-2 text-sm text-emerald-700">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <strong>1 Scheduled Session:</strong> {new Date(lesson.startTime).toLocaleDateString()}
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <strong>4 Pre-paid Credits:</strong> Added to your dashboard
              </li>
            </ul>
          </div>
        )}

        <hr className="border-slate-100" />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>€{totalPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Platform Fee</span>
            <span>€0.00</span>
          </div>
          <div className="flex justify-between pt-4">
            <span className="font-bold text-slate-900 text-lg">Total Paid</span>
            <span className="font-black text-indigo-600 text-2xl">€{totalPaid.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col gap-3">
        <Link 
          to="/my-lessons" 
          className="w-full bg-slate-900 text-white text-center py-4 rounded-2xl font-bold hover:bg-slate-800 transition shadow-lg"
        >
          Go to My Dashboard
        </Link>
        <button 
          onClick={() => window.print()}
          className="w-full border border-slate-200 text-slate-600 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50 transition"
        >
          Download PDF / Print
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-400 mt-8 uppercase tracking-widest leading-relaxed">
        Thank you for choosing Lernitt. <br />
        This price is locked for your current bundle.
      </p>
    </div>
  );
}
