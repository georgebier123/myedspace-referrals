'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { PixelLoader } from '@/components/PixelLoader';

type PhoneFormat = 'US' | 'UK' | 'AU' | 'EU' | 'none';

const PHONE_FORMATS: Record<PhoneFormat, { placeholder: string; label: string }> = {
  US: { placeholder: '+1 (555) 123-4567', label: 'United States (+1)' },
  UK: { placeholder: '+44 7911 123456', label: 'United Kingdom (+44)' },
  AU: { placeholder: '+61 412 345 678', label: 'Australia (+61)' },
  EU: { placeholder: '+49 151 12345678', label: 'Europe (Generic)' },
  none: { placeholder: 'Enter phone number', label: 'No format' },
};

interface Campaign {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  copy: {
    friend_page_title: string;
    friend_page_subtitle: string;
    friend_form_heading: string;
    friend_success_title: string;
    friend_success_message: string;
    friend_submit_button: string;
  };
  standard_fields: {
    phone: boolean;
    child_grade: boolean;
  };
  custom_fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'select' | 'textarea';
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
  phone_format: PhoneFormat;
}

interface Referrer {
  name: string;
  email: string;
}

export default function CampaignReferPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignSlug = params.campaign as string;
  const refCode = searchParams.get('ref');

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [referrer, setReferrer] = useState<Referrer | null>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);
  const [isValidating, setIsValidating] = useState(true);

  const [friendName, setFriendName] = useState('');
  const [friendEmail, setFriendEmail] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await fetch(`/api/campaigns/${campaignSlug}`);
        if (response.ok) {
          const data = await response.json();
          setCampaign(data.campaign);
        } else {
          router.push('/');
          return;
        }
      } catch {
        router.push('/');
        return;
      } finally {
        setIsLoadingCampaign(false);
      }
    }
    fetchCampaign();
  }, [campaignSlug, router]);

  useEffect(() => {
    if (!refCode) {
      setIsValidating(false);
      return;
    }

    async function validateCode() {
      try {
        const response = await fetch(`/api/validate-code?code=${refCode}`);
        if (response.ok) {
          const data = await response.json();
          setReferrer(data.referrer);
        }
      } catch {
        console.error('Failed to validate code');
      } finally {
        setIsValidating(false);
      }
    }
    validateCode();
  }, [refCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/refer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: refCode,
          friendName,
          friendEmail,
          friendPhone,
          childGrade,
          campaignId: campaign?.id,
          customFields: customFieldValues,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        // Redirect to booking after delay
        if (data.bookingUrl) {
          setTimeout(() => {
            window.location.href = data.bookingUrl;
          }, 3000);
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomField = (name: string, value: string) => {
    setCustomFieldValues(prev => ({ ...prev, [name]: value }));
  };

  if (isLoadingCampaign || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PixelLoader message="Loading..." />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  if (!refCode || !referrer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-2xl font-black text-[#101626] mb-4 uppercase">
            Invalid Referral Link
          </h1>
          <p className="text-[#101626] mb-6">
            This referral link is invalid or has expired. Please ask your friend for a new link.
          </p>
          <a href="/" className="btn-primary inline-block">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <div className="mb-4">
            <span className="text-5xl">🎉</span>
          </div>
          <h1 className="text-2xl font-black text-[#101626] mb-4 uppercase">
            {campaign.copy.friend_success_title}
          </h1>
          <p className="text-[#101626]">
            {campaign.copy.friend_success_message}
          </p>
          <p className="text-sm text-[#101626]/60 mt-4">
            Redirecting you to book your session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-[#101626] mb-4 uppercase leading-tight">
            {campaign.copy.friend_page_title}
          </h1>
          <p className="text-[#101626] text-lg">
            {campaign.copy.friend_page_subtitle}
          </p>
        </div>

        {/* Referrer Info */}
        <div className="card p-4 mb-6 text-center">
          <p className="text-sm text-[#101626]/60 uppercase font-bold">Referred by</p>
          <p className="text-[#101626] font-bold text-lg">{referrer.name}</p>
        </div>

        {/* Signup Form */}
        <div className="card p-6">
          <h2 className="text-xl font-black text-[#101626] mb-4 uppercase text-center">
            {campaign.copy.friend_form_heading}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="friendName"
                className="block text-sm font-bold text-[#101626] mb-1 uppercase"
              >
                Your Name
              </label>
              <input
                type="text"
                id="friendName"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                className="input-pixel w-full"
                placeholder="Jane Smith"
                required
              />
            </div>

            <div>
              <label
                htmlFor="friendEmail"
                className="block text-sm font-bold text-[#101626] mb-1 uppercase"
              >
                Your Email
              </label>
              <input
                type="email"
                id="friendEmail"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                className="input-pixel w-full"
                placeholder="jane@example.com"
                required
              />
            </div>

            {campaign.standard_fields.phone && (
              <div>
                <label
                  htmlFor="friendPhone"
                  className="block text-sm font-bold text-[#101626] mb-1 uppercase"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="friendPhone"
                  value={friendPhone}
                  onChange={(e) => setFriendPhone(e.target.value)}
                  className="input-pixel w-full"
                  placeholder={PHONE_FORMATS[campaign.phone_format || 'US'].placeholder}
                />
              </div>
            )}

            {campaign.standard_fields.child_grade && (
              <div>
                <label
                  htmlFor="childGrade"
                  className="block text-sm font-bold text-[#101626] mb-1 uppercase"
                >
                  Child&apos;s Grade
                </label>
                <select
                  id="childGrade"
                  value={childGrade}
                  onChange={(e) => setChildGrade(e.target.value)}
                  className="input-pixel w-full"
                >
                  <option value="">Select grade...</option>
                  <option value="K">Kindergarten</option>
                  <option value="1">1st Grade</option>
                  <option value="2">2nd Grade</option>
                  <option value="3">3rd Grade</option>
                  <option value="4">4th Grade</option>
                  <option value="5">5th Grade</option>
                  <option value="6">6th Grade</option>
                  <option value="7">7th Grade</option>
                  <option value="8">8th Grade</option>
                  <option value="9">9th Grade</option>
                  <option value="10">10th Grade</option>
                  <option value="11">11th Grade</option>
                  <option value="12">12th Grade</option>
                </select>
              </div>
            )}

            {/* Custom Fields */}
            {campaign.custom_fields.map((field) => (
              <div key={field.name}>
                <label
                  htmlFor={field.name}
                  className="block text-sm font-bold text-[#101626] mb-1 uppercase"
                >
                  {field.label}
                  {field.required && <span className="text-[#ff3333]">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    id={field.name}
                    value={customFieldValues[field.name] || ''}
                    onChange={(e) => updateCustomField(field.name, e.target.value)}
                    className="input-pixel w-full"
                    required={field.required}
                  >
                    <option value="">Select...</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    value={customFieldValues[field.name] || ''}
                    onChange={(e) => updateCustomField(field.name, e.target.value)}
                    className="input-pixel w-full"
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={3}
                  />
                ) : (
                  <input
                    type={field.type}
                    id={field.name}
                    value={customFieldValues[field.name] || ''}
                    onChange={(e) => updateCustomField(field.name, e.target.value)}
                    className="input-pixel w-full"
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}

            {error && (
              <div className="bg-[#ff3333]/10 border-3 border-[#ff3333] p-3">
                <p className="text-sm text-[#ff3333] font-bold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing Up...' : (campaign.copy.friend_submit_button || 'Sign Up & Book Session')}
            </button>
          </form>

          <p className="text-xs text-[#101626]/60 mt-4 text-center">
            By signing up, you agree to the{' '}
            <a href={`/${campaignSlug}/terms`} className="text-[#3533ff] hover:underline">
              Terms & Conditions
            </a>
            {' '}and you consent to receiving marketing communications from MyEdSpace
          </p>
        </div>
      </div>
    </div>
  );
}
