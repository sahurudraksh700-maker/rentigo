import { useEffect, useState, FormEvent } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface ProjectInquiryFormProps {
  prefilledScope: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  details?: string;
}

export function ProjectInquiryForm({
  prefilledScope,
}: ProjectInquiryFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [scope, setScope] = useState(prefilledScope);
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBrief, setSubmittedBrief] = useState<{
    name: string;
    email: string;
    scope: string;
  } | null>(null);

  useEffect(() => {
    if (prefilledScope) {
      setScope(prefilledScope);
    }
  }, [prefilledScope]);

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (name.trim().length < 2) {
      nextErrors.name = 'Please enter your full name (at least 2 characters).';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Please enter a valid work email address.';
    }
    if (details.trim().length < 15) {
      nextErrors.details =
        'Please share a short summary of your goals (at least 15 characters).';
    }
    return nextErrors;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    window.setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedBrief({
        name: name.trim(),
        email: email.trim(),
        scope: scope.trim() || 'Custom Website Engagement',
      });
    }, 350);
  };

  const handleReset = () => {
    setSubmittedBrief(null);
    setName('');
    setEmail('');
    setWebsite('');
    setDetails('');
    setErrors({});
  };

  return (
    <section id="contact" className="py-16 lg:py-24">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Context Column */}
          <div className="lg:col-span-5">
            <p className="text-sm font-medium text-[#575852] mb-2">
              Start a Conversation
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#111210] [text-wrap:balance]">
              Tell us what your next website needs to achieve.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#575852]">
              We take on three new client builds each month so senior designers
              and engineers stay hands-on from first wireframe to deployment.
            </p>

            <div className="mt-8 pt-6 border-t border-[#E2E2DC] space-y-4 text-sm">
              <div>
                <div className="font-semibold text-[#111210]">
                  Response Time
                </div>
                <div className="text-[#575852] mt-0.5">
                  Within 1 business day with proposed discovery call slots.
                </div>
              </div>
              <div>
                <div className="font-semibold text-[#111210]">
                  Direct Studio Email
                </div>
                <a
                  href="mailto:hello@meridian.studio"
                  className="text-[#1E40AF] hover:underline mt-0.5 inline-block"
                >
                  hello@meridian.studio
                </a>
              </div>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7 bg-white border border-[#E2E2DC] rounded-xl p-6 sm:p-8">
            {submittedBrief ? (
              <div className="py-6 space-y-5" role="status" aria-live="polite">
                <div className="inline-flex items-center gap-2 text-[#166534] font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Project brief received</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[#111210]">
                  Thank you, {submittedBrief.name}.
                </h3>
                <p className="text-sm leading-relaxed text-[#575852]">
                  We have logged your brief for{' '}
                  <span className="font-medium text-[#111210]">
                    {submittedBrief.scope}
                  </span>{' '}
                  and will follow up at{' '}
                  <span className="font-medium text-[#111210]">
                    {submittedBrief.email}
                  </span>{' '}
                  within one business day.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-2.5 min-h-[40px] text-sm font-medium text-[#111210] bg-[#ECECE7] rounded-lg hover:bg-[#E2E2DC] transition-colors duration-150 cursor-pointer"
                  >
                    Submit Another Brief
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="brief-name"
                      className="block text-sm font-medium text-[#111210] mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="brief-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      aria-invalid={Boolean(errors.name)}
                      className={`w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border rounded-lg text-[#111210] placeholder:text-[#8C8E85] transition-colors ${
                        errors.name
                          ? 'border-[#B91C1C]'
                          : 'border-[#E2E2DC] hover:border-[#C8C8BE]'
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#B91C1C]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="brief-email"
                      className="block text-sm font-medium text-[#111210] mb-1.5"
                    >
                      Work Email
                    </label>
                    <input
                      id="brief-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@company.com"
                      aria-invalid={Boolean(errors.email)}
                      className={`w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border rounded-lg text-[#111210] placeholder:text-[#8C8E85] transition-colors ${
                        errors.email
                          ? 'border-[#B91C1C]'
                          : 'border-[#E2E2DC] hover:border-[#C8C8BE]'
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#B91C1C]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="brief-website"
                      className="block text-sm font-medium text-[#111210] mb-1.5"
                    >
                      Current Website (Optional)
                    </label>
                    <input
                      id="brief-website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://company.com"
                      className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-[#E2E2DC] hover:border-[#C8C8BE] rounded-lg text-[#111210] placeholder:text-[#8C8E85]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="brief-scope"
                      className="block text-sm font-medium text-[#111210] mb-1.5"
                    >
                      Target Scope
                    </label>
                    <input
                      id="brief-scope"
                      type="text"
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      placeholder="Marketing Website (6–12 pages)"
                      className="w-full px-3.5 py-2.5 min-h-[44px] text-sm bg-white border border-[#E2E2DC] hover:border-[#C8C8BE] rounded-lg text-[#111210] placeholder:text-[#8C8E85]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="brief-details"
                    className="block text-sm font-medium text-[#111210] mb-1.5"
                  >
                    Project Goals &amp; Launch Date
                  </label>
                  <textarea
                    id="brief-details"
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Share your target launch window, key pages needed, and what isn't working on your current site."
                    aria-invalid={Boolean(errors.details)}
                    className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-[#111210] placeholder:text-[#8C8E85] transition-colors ${
                      errors.details
                        ? 'border-[#B91C1C]'
                        : 'border-[#E2E2DC] hover:border-[#C8C8BE]'
                    }`}
                  />
                  {errors.details && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#B91C1C]">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{errors.details}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="text-xs text-[#575852]">
                    No automated mailing lists. Direct reply from a studio
                    partner.
                  </span>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] text-sm font-medium text-white bg-[#1E40AF] rounded-lg hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>
                      {isSubmitting
                        ? 'Sending Brief...'
                        : 'Schedule Discovery Call'}
                    </span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
