import { useState } from 'react';

const SlackMeButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/slack-dm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, message }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setMessage('');
        setName('');
        setTimeout(() => {
          setIsModalOpen(false);
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmitStatus('error');
    }

    setIsSubmitting(false);
  };

  return (
    <>
      {/* Floating Slack Me CTA Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="group relative flex items-center gap-3 px-4 py-3 bg-[#4A154B] hover:bg-[#350d36] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-medium hover:scale-105"
        title="Send me a Slack message"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523A2.528 2.528 0 0 1 5.042 10.12h2.52v2.522a2.528 2.528 0 0 1-2.52 2.523Zm0-6.305a2.528 2.528 0 0 1-2.52-2.523A2.528 2.528 0 0 1 5.042 3.815a2.528 2.528 0 0 1 2.52 2.522 2.528 2.528 0 0 1-2.52 2.523Zm6.305 0a2.528 2.528 0 0 1-2.522-2.523A2.528 2.528 0 0 1 11.347 3.815a2.528 2.528 0 0 1 2.523 2.522 2.528 2.528 0 0 1-2.523 2.523Zm0 6.305a2.528 2.528 0 0 1-2.522-2.523v-2.522h2.522a2.528 2.528 0 0 1 2.523 2.522 2.528 2.528 0 0 1-2.523 2.523Zm6.304 0a2.528 2.528 0 0 1-2.523-2.523A2.528 2.528 0 0 1 17.651 10.12a2.528 2.528 0 0 1 2.523 2.522 2.528 2.528 0 0 1-2.523 2.523Zm0-6.305a2.528 2.528 0 0 1-2.523-2.523v-2.522a2.528 2.528 0 0 1 2.523-2.522A2.528 2.528 0 0 1 20.174 6.337a2.528 2.528 0 0 1-2.523 2.523Zm-6.304 6.305v2.523a2.528 2.528 0 0 1-2.522 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.523Z"/>
        </svg>
        <span className="hidden sm:block">Slack Me</span>

        {/* Pulse animation */}
        <div className="absolute -inset-1 bg-[#4A154B] rounded-full opacity-75 animate-ping"></div>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-primary-900 rounded-xl shadow-xl border border-primary-200 dark:border-primary-700 p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-primary-900 dark:text-primary-100">
                Send me a Slack DM
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-primary-200 dark:border-primary-600 rounded-lg bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-primary-200 dark:border-primary-600 rounded-lg bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  placeholder="What would you like to discuss?"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#4A154B] hover:bg-[#350d36] text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </div>
                ) : (
                  'Send to Slack'
                )}
              </button>

              {submitStatus === 'success' && (
                <div className="text-green-600 dark:text-green-400 text-sm text-center">
                  ✓ Message sent! I'll get back to you soon.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="text-red-600 dark:text-red-400 text-sm text-center">
                  ✗ Failed to send message. Please try again.
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SlackMeButton;