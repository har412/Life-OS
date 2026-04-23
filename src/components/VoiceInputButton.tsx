"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import AddTaskModal from "./AddTaskModal";

export default function VoiceInputButton() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center z-50 shadow-lg transition-all active:scale-95 bg-orange-500 hover:bg-orange-600 shadow-orange-200"
        title="Add new task"
      >
        <Plus className="w-6 h-6 text-white" strokeWidth={3} />
      </button>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} />}
    </>
  );
}
