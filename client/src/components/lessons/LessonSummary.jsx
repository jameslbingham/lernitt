import React from 'react';

const LessonSummary = ({ aiSummary, recordingUrl }) => {
  if (!aiSummary) return (
    <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
      <p className="text-gray-500 italic">Your AI Academic Secretary is still processing this lesson. Check back in a few minutes!</p>
    </div>
  );

  // Helper to jump video to timestamp (assumes a ref to video player exists)
  const seekTo = (timestamp) => {
    const video = document.querySelector('video');
    if (video) {
      const [mins, secs] = timestamp.split(':').map(Number);
      video.currentTime = (mins * 60) + secs;
      video.play();
    }
  };

  return (
    <div className="space-y-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      
      {/* 1. EXECUTIVE SUMMARY & THEME */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-800">Lesson Dashboard</h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            Theme: {aiSummary.theme}
          </span>
        </div>
        <p className="text-gray-600 leading-relaxed">{aiSummary.summary}</p>
      </section>

      <hr className="border-gray-100" />

      {/* 2. VOCABULARY VAULT */}
      <section>
        <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
          <span className="mr-2">📚</span> Vocabulary Vault
        </h4>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Definition</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Context</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jump</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {aiSummary.vocabulary.map((item, idx) => (
                <tr key={idx} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-blue-600">{item.word}</td>
                  <td className="px-4 py-3 text-gray-600">{item.definition}</td>
                  <td className="px-4 py-3 italic text-gray-500">"{item.example}"</td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => seekTo(item.timestamp)}
                      className="text-xs bg-gray-800 text-white px-2 py-1 rounded hover:bg-black"
                    >
                      {item.timestamp}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. GRAMMAR LOG */}
      <section>
        <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
          <span className="mr-2">✍️</span> Grammar Fixes
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiSummary.grammarLog.map((log, idx) => (
            <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="text-sm text-red-400 line-through mb-1">{log.error}</div>
              <div className="text-md font-semibold text-green-700 mb-2">→ {log.correction}</div>
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Rule: {log.rule}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. DEEP DIVE & ANALYTICS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-indigo-900 text-white rounded-xl">
          <h4 className="font-bold mb-2">Thematic Deep Dive: {aiSummary.deepDive.topic}</h4>
          <p className="text-indigo-100 text-sm mb-4">{aiSummary.deepDive.expertTip}</p>
          <div className="flex flex-wrap gap-2">
            {aiSummary.deepDive.alternativePhrasing.map((phrase, i) => (
              <span key={i} className="text-xs bg-indigo-700 px-2 py-1 rounded">"{phrase}"</span>
            ))}
          </div>
        </div>
        
        <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-bold text-gray-800 mb-4">Fluency Stats</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Student Talk Time</span>
                <span>{aiSummary.analytics.studentTalkTime}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${aiSummary.analytics.studentTalkTime}%` }}></div>
              </div>
            </div>
            <div className="text-center pt-2">
              <div className="text-3xl font-black text-blue-600">{aiSummary.analytics.fluencyScore}/10</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest">Fluency Score</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LessonSummary;
