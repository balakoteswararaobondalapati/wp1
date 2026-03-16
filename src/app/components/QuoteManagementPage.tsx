import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Quote as QuoteIcon } from 'lucide-react';
import { quotesAPI } from '../api';
import { buildSeedQuotes } from '../utils/defaultQuotes';

interface QuoteManagementPageProps {
  onBack: () => void;
}

interface Quote {
  id: number;
  text: string;
  author?: string;
  createdAt?: string;
  textColor?: string;
  bgColor?: string;
  fontSize?: number;
}

export function QuoteManagementPage({ onBack }: QuoteManagementPageProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('');
  const [newTextColor, setNewTextColor] = useState('#1F2937'); // Default dark gray
  const [newBgColor, setNewBgColor] = useState('#DBEAFE'); // Default light blue
  const [newFontSize, setNewFontSize] = useState(14); // Default font size in px
  const [isSeeding, setIsSeeding] = useState(false);

  const formatAuthor = (raw: string | undefined) => {
    const value = String(raw || '').trim();
    if (!value) return '';
    const normalized = value.toLowerCase();
    if (normalized === 'unknown' || normalized === 'anonymous' || normalized === 'n/a') {
      return '';
    }
    return value;
  };

  const normalizeQuote = (raw: any): Quote => ({
    id: Number(raw?.id || 0),
    text: raw?.text || '',
    author: formatAuthor(raw?.author),
    createdAt: raw?.created_at || raw?.createdAt || '',
    textColor: raw?.text_color || raw?.textColor || '#1F2937',
    bgColor: raw?.bg_color || raw?.bgColor || '#DBEAFE',
    fontSize: raw?.font_size || raw?.fontSize || 14,
  });

  // Load quotes from backend
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const rows = await quotesAPI.getAll();
        setQuotes((rows || []).map(normalizeQuote));
      } catch (error) {
        console.error('Failed to load quotes:', error);
        setQuotes([]);
      }
    };

    loadQuotes();
  }, []);

  // Add new quote
  const handleAddQuote = async () => {
    if (!newQuoteText.trim()) {
      alert('Please enter a quote text');
      return;
    }

    try {
      const created = await quotesAPI.create({
        text: newQuoteText.trim(),
        author: newQuoteAuthor.trim(),
        text_color: newTextColor,
        bg_color: newBgColor,
        font_size: newFontSize,
      });
      setQuotes((prev) => [normalizeQuote(created), ...prev]);
      setNewQuoteText('');
      setNewQuoteAuthor('');
      setNewTextColor('#1F2937');
      setNewBgColor('#DBEAFE');
      setNewFontSize(14);
    } catch (error) {
      console.error('Failed to create quote:', error);
      alert('Failed to create quote. Please try again.');
    }
  };

  // Delete quote
  const handleDeleteQuote = async (id: number) => {
    if (confirm('Are you sure you want to delete this quote?')) {
      try {
        await quotesAPI.delete(id);
        setQuotes(quotes.filter((q) => q.id !== id));
      } catch (error) {
        console.error('Failed to delete quote:', error);
        alert('Failed to delete quote. Please try again.');
      }
    }
  };

  const handleSeedQuotes = async () => {
    if (isSeeding) return;

    const seedQuotes = buildSeedQuotes();
    const existingTexts = new Set(quotes.map((quote) => quote.text.trim().toLowerCase()));
    const missingQuotes = seedQuotes.filter((quote) => !existingTexts.has(quote.text.trim().toLowerCase()));

    if (missingQuotes.length === 0) {
      alert('All 60 motivational quotes are already added.');
      return;
    }

    setIsSeeding(true);
    try {
      const createdQuotes: Quote[] = [];
      for (const quote of missingQuotes) {
        const created = await quotesAPI.create(quote);
        createdQuotes.push(normalizeQuote(created));
      }
      setQuotes((prev) => [...createdQuotes, ...prev]);
      alert(`${createdQuotes.length} motivational quotes added.`);
    } catch (error) {
      console.error('Failed to seed quotes:', error);
      alert('Failed to add motivational quotes. Please try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 pb-6 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-md sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl text-white">Quote Management</h1>
          </div>
          <p className="text-sm text-green-50 ml-14">
            Add daily quotes for students
          </p>
        </div>
        <div className="h-1 bg-emerald-700"></div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-6 space-y-6">
        {/* Add Quote Section */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-gray-900">Add New Quote</h2>
          </div>

          {/* Quote Text */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quote Text <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newQuoteText}
              onChange={(e) => setNewQuoteText(e.target.value)}
              placeholder="Enter the quote..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          {/* Author */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Author (Optional)
            </label>
            <input
              type="text"
              value={newQuoteAuthor}
              onChange={(e) => setNewQuoteAuthor(e.target.value)}
              placeholder="e.g., Albert Einstein"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Text Color */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <input
              type="color"
              value={newTextColor}
              onChange={(e) => setNewTextColor(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Background Color */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
            </label>
            <input
              type="color"
              value={newBgColor}
              onChange={(e) => setNewBgColor(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Size (px)
            </label>
            <input
              type="number"
              value={newFontSize}
              onChange={(e) => setNewFontSize(Number(e.target.value))}
              placeholder="e.g., 14"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Live Preview */}
          {(newQuoteText || newQuoteAuthor) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Live Preview
              </label>
              <div
                className="rounded-2xl p-5 shadow-lg border-2"
                style={{
                  backgroundColor: newBgColor,
                  borderColor: `${newBgColor}40`,
                  color: newTextColor
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl opacity-80 flex-shrink-0">"</div>
                  <div className="flex-1">
                    <p 
                      className="italic leading-relaxed mb-2"
                      style={{ fontSize: `${newFontSize}px` }}
                    >
                      {newQuoteText || 'Your quote text will appear here...'}
                    </p>
                    {formatAuthor(newQuoteAuthor) && (
                      <p 
                        className="text-right opacity-90"
                        style={{ fontSize: `${Math.max(10, newFontSize - 2)}px` }}
                      >
                        — {formatAuthor(newQuoteAuthor)}
                      </p>
                    )}
                  </div>
                  <div className="text-3xl opacity-80 flex-shrink-0 self-end">"</div>
                </div>
              </div>
            </div>
          )}

          {/* Post Button */}
          <button
            onClick={handleAddQuote}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-medium hover:shadow-lg active:scale-98 transition-all"
          >
            Post Quote
          </button>
        </div>

        {/* Quotes List */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">All Quotes ({quotes.length})</h2>
            <div className="text-xs text-gray-500">
              Rotates daily automatically
            </div>
          </div>

          <button
            onClick={handleSeedQuotes}
            disabled={isSeeding}
            className="w-full mb-4 bg-blue-50 text-blue-700 border border-blue-200 py-3 rounded-xl font-medium hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 transition-all"
          >
            {isSeeding ? 'Adding Motivational Quotes...' : 'Add 60 Motivational Quotes'}
          </button>

          {quotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <QuoteIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No quotes added yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Add your first quote above
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote, index) => (
                <div
                  key={quote.id}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {/* Quote Number Badge */}
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {index + 1}
                    </div>

                    {/* Quote Content */}
                    <div className="flex-1">
                      {/* Preview with colors */}
                      <div
                        className="mb-2 p-3 rounded-lg"
                        style={{
                          backgroundColor: quote.bgColor || '#DBEAFE',
                          color: quote.textColor || '#1F2937'
                        }}
                      >
                        <p 
                          className="italic"
                          style={{ fontSize: `${quote.fontSize || 14}px` }}
                        >
                          "{quote.text}"
                        </p>
                        {quote.author && (
                          <p 
                            className="mt-1"
                            style={{ fontSize: `${Math.max(10, (quote.fontSize || 14) - 2)}px` }}
                          >
                            — {quote.author}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        Added on {quote.createdAt ? new Date(String(quote.createdAt).replace(' ', 'T')).toLocaleDateString() : '-'}
                      </p>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                      title="Delete Quote"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">
                How it works:
              </p>
              <p className="text-xs text-blue-700">
                Quotes rotate automatically each day in the Student Portal and switch after local midnight at 12:00 AM.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
