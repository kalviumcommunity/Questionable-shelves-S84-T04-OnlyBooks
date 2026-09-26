import React from "react";
import type { User } from "../../App";

interface FacultyDashboardProps {
  user: User;
  onOpenDeposit?: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ user, onOpenDeposit }) => {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <section className="glass-panel p-6 rounded-xl border border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold font-display mb-2">Faculty Archive Console</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your uploaded manuscripts, organize course reserves, and track student citation metrics.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onOpenDeposit}
            className="btn-primary px-4 py-2 text-sm"
          >
            Upload Manuscript
          </button>
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() => alert("Course Reserve management module will be available in the upcoming academic term.")}
          >
            Create Course Reserve
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="glass-panel p-5 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">My Deposited Manuscripts</h2>
          {/* TODO: Fetch and map faculty-specific /api/catalog/my-deposits */}
          <div className="text-sm text-gray-500 italic">No manuscripts deposited yet.</div>
        </section>

        <section className="glass-panel p-5 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Citation Analytics</h2>
          {/* TODO: Render metric cards (e.g., Total Citations, Top Cited Work) */}
          <div className="text-sm text-gray-500 italic">Analytics will appear once your work is cited in student inquiries.</div>
        </section>
      </div>
    </div>
  );
};

export default FacultyDashboard;
