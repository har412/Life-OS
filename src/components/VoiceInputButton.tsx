"use client";
import { useState } from "react";
import { Mic } from "lucide-react";
import AddTaskModal from "./AddTaskModal";

export default function VoiceInputButton() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 lg:bottom-8 right-5 lg:right-8 z-50 w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200"
        title="Add task via Voice"
      >
        <Mic className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={2.25} />
      </button>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} />}
    </>
  );
}

