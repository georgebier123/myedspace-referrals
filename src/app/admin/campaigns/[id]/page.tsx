'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PixelLoader, PixelSpinner } from '@/components/PixelLoader';

interface CustomFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface StandardFormFields {
  phone: boolean;
  child_grade: boolean;
}

interface CampaignCopy {
  referrer_page_title: string;
  referrer_page_subtitle: string;
  referrer_form_heading: string;
  referrer_success_title: string;
  referrer_success_message: string;
  friend_page_title: string;
  friend_page_subtitle: string;
  friend_form_heading: string;
  friend_success_title: string;
  friend_success_message: string;
  friend_submit_button: string;
  reward_description: string;
  terms_content: string;
}

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
  reward_amount: string;
  reward_type: string;
  hubspot_portal_id: string | null;
  hubspot_form_guid: string | null;
  hubspot_friend_form_guid: string | null;
  slack_notifications: boolean;
  copy: CampaignCopy;
  standard_fields: StandardFormFields;
  custom_fields: CustomFormField[];
  phone_format: PhoneFormat;
  booking_url: string | null;
  created_at: string;
  updated_at: string;
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        onLogin();
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full">
        <h1 className="text-2xl font-black text-[#101626] mb-6 text-center uppercase">
          Admin Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-[#101626] mb-1 uppercase">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-pixel w-full"
              placeholder="Enter admin password"
              required
            />
          </div>
          {error && (
            <div className="pixel-shake bg-[#ff3333]/10 border-3 border-[#ff3333] p-3">
              <p className="text-sm text-[#ff3333] font-bold">{error}</p>
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CampaignEditorPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'copy' | 'fields' | 'hubspot'>('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Campaign>>({});

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/auth');
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`);
      if (response.ok) {
        const data = await response.json();
        setCampaign(data.campaign);
        setFormData(data.campaign);
      } else {
        router.push('/admin/campaigns');
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
      router.push('/admin/campaigns');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaign();
    }
  }, [isAuthenticated, fetchCampaign]);

  const updateFormData = (updates: Partial<Campaign>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateCopy = (key: keyof CampaignCopy, value: string) => {
    setFormData(prev => ({
      ...prev,
      copy: { ...prev.copy, [key]: value } as CampaignCopy,
    }));
    setHasChanges(true);
  };

  const updateStandardFields = (key: keyof StandardFormFields, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      standard_fields: { ...prev.standard_fields, [key]: value } as StandardFormFields,
    }));
    setHasChanges(true);
  };

  const addCustomField = () => {
    const newField: CustomFormField = {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: '',
    };
    setFormData(prev => ({
      ...prev,
      custom_fields: [...(prev.custom_fields || []), newField],
    }));
    setHasChanges(true);
  };

  const updateCustomField = (index: number, updates: Partial<CustomFormField>) => {
    setFormData(prev => {
      const fields = [...(prev.custom_fields || [])];
      fields[index] = { ...fields[index], ...updates };
      return { ...prev, custom_fields: fields };
    });
    setHasChanges(true);
  };

  const removeCustomField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: (prev.custom_fields || []).filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setCampaign(data.campaign);
        setFormData(data.campaign);
        setHasChanges(false);
        alert('Campaign saved successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save campaign');
      }
    } catch {
      alert('Failed to save campaign');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/campaigns');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete campaign');
      }
    } catch {
      alert('Failed to delete campaign');
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PixelLoader message="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => { setIsAuthenticated(true); fetchCampaign(); }} />;
  }

  if (isLoading || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PixelLoader message="Loading campaign..." />
      </div>
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://refer.myedspace.com';

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <button
              onClick={() => router.push('/admin/campaigns')}
              className="text-sm text-[#3533ff] font-bold mb-2 hover:underline"
            >
              ← Back to Campaigns
            </button>
            <h1 className="text-2xl font-black text-[#101626] uppercase">
              {campaign.name}
            </h1>
            <p className="text-[#101626]/60 text-sm font-mono">
              {baseUrl}/{formData.slug}
            </p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <span className="text-sm text-[#ff3333] font-bold self-center mr-2">
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="btn-primary flex items-center gap-2"
            >
              {isSaving ? <PixelSpinner size={16} /> : null}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['general', 'copy', 'fields', 'hubspot'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold uppercase text-sm border-2 border-[#101626] transition-all ${
                activeTab === tab
                  ? 'bg-[#3533ff] text-white'
                  : 'bg-white text-[#101626] hover:bg-[#a3e1f0]'
              }`}
            >
              {tab === 'hubspot' ? 'HubSpot' : tab}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="card p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#101626] mb-1 uppercase">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  className="input-pixel w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#101626] mb-1 uppercase">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => updateFormData({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="input-pixel w-full"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#101626] mb-1 uppercase">
                  Reward Amount
                </label>
                <input
                  type="text"
                  value={formData.reward_amount || ''}
                  onChange={(e) => updateFormData({ reward_amount: e.target.value })}
                  className="input-pixel w-full"
                  placeholder="$150"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#101626] mb-1 uppercase">
                  Reward Type
                </label>
                <input
                  type="text"
                  value={formData.reward_type || ''}
                  onChange={(e) => updateFormData({ reward_type: e.target.value })}
                  className="input-pixel w-full"
                  placeholder="Amazon Gift Card"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#101626] mb-1 uppercase">
                Phone Number Format
              </label>
              <select
                value={formData.phone_format || 'US'}
                onChange={(e) => updateFormData({ phone_format: e.target.value as PhoneFormat })}
                className="input-pixel w-full"
              >
                {Object.entries(PHONE_FORMATS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-[#101626]/60 mt-1">
                Sets the placeholder format for phone input on friend signup form
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#101626] mb-1 uppercase">
                Redirect URL after Friend Signup
              </label>
              <input
                type="url"
                value={formData.booking_url || ''}
                onChange={(e) => updateFormData({ booking_url: e.target.value || null })}
                className="input-pixel w-full"
                placeholder="https://exams.myedspace.co.uk/"
              />
              <p className="text-sm text-[#101626]/60 mt-1">
                Where friends are redirected after signup. Leave blank to use default booking page.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active ?? true}
                  onChange={(e) => updateFormData({ active: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="font-bold text-[#101626] uppercase">Campaign Active</span>
              </label>
              <p className="text-sm text-[#101626]/60 mt-1">
                Inactive campaigns won&apos;t accept new registrations
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.slack_notifications ?? true}
                  onChange={(e) => updateFormData({ slack_notifications: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="font-bold text-[#101626] uppercase">Slack Notifications</span>
              </label>
              <p className="text-sm text-[#101626]/60 mt-1">
                Send Slack alerts for new referral signups and qualified referrals
              </p>
            </div>

            <div className="border-t-2 border-[#101626] pt-6">
              <h3 className="font-bold text-[#101626] uppercase mb-2">Danger Zone</h3>
              <button
                onClick={handleDelete}
                className="text-sm px-4 py-2 bg-[#ff3333] text-white border-2 border-[#101626] font-bold uppercase hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0_#101626]"
              >
                Delete Campaign
              </button>
            </div>
          </div>
        )}

        {/* Copy Tab */}
        {activeTab === 'copy' && (
          <div className="card p-6 space-y-6">
            <div>
              <h3 className="font-bold text-[#101626] uppercase mb-4 border-b-2 border-[#101626] pb-2">
                Referrer Registration Page
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Page Title</label>
                  <input
                    type="text"
                    value={formData.copy?.referrer_page_title || ''}
                    onChange={(e) => updateCopy('referrer_page_title', e.target.value)}
                    className="input-pixel w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Page Subtitle</label>
                  <textarea
                    value={formData.copy?.referrer_page_subtitle || ''}
                    onChange={(e) => updateCopy('referrer_page_subtitle', e.target.value)}
                    className="input-pixel w-full"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Form Heading</label>
                  <input
                    type="text"
                    value={formData.copy?.referrer_form_heading || ''}
                    onChange={(e) => updateCopy('referrer_form_heading', e.target.value)}
                    className="input-pixel w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Success Title</label>
                  <input
                    type="text"
                    value={formData.copy?.referrer_success_title || ''}
                    onChange={(e) => updateCopy('referrer_success_title', e.target.value)}
                    className="input-pixel w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Success Message</label>
                  <textarea
                    value={formData.copy?.referrer_success_message || ''}
                    onChange={(e) => updateCopy('referrer_success_message', e.target.value)}
                    className="input-pixel w-full"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-[#101626] uppercase mb-4 border-b-2 border-[#101626] pb-2">
                Friend Signup Page
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Page Title</label>
                  <input
                    type="text"
                    value={formData.copy?.friend_page_title || ''}
                    onChange={(e) => updateCopy('friend_page_title', e.target.value)}
                    className="input-pixel w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Page Subtitle</label>
                  <textarea
                    value={formData.copy?.friend_page_subtitle || ''}
                    onChange={(e) => updateCopy('friend_page_subtitle', e.target.value)}
                    className="input-pixel w-full"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Form Heading</label>
                  <input
                    type="text"
                    value={formData.copy?.friend_form_heading || ''}
                    onChange={(e) => updateCopy('friend_form_heading', e.target.value)}
                    className="input-pixel w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Success Title</label>
                  <input
                    type="text"
                    value={formData.copy?.friend_success_title || ''}
                    onChange={(e) => updateCopy('friend_success_title', e.target.value)}
                    className="input-pixel w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Success Message</label>
                  <textarea
                    value={formData.copy?.friend_success_message || ''}
                    onChange={(e) => updateCopy('friend_success_message', e.target.value)}
                    className="input-pixel w-full"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Submit Button Text</label>
                  <input
                    type="text"
                    value={formData.copy?.friend_submit_button || ''}
                    onChange={(e) => updateCopy('friend_submit_button', e.target.value)}
                    className="input-pixel w-full"
                    placeholder="Sign Up & Book Session"
                  />
                  <p className="text-sm text-[#101626]/60 mt-1">
                    Text displayed on the form submit button
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-[#101626] uppercase mb-4 border-b-2 border-[#101626] pb-2">
                Reward & Terms
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Reward Description</label>
                  <textarea
                    value={formData.copy?.reward_description || ''}
                    onChange={(e) => updateCopy('reward_description', e.target.value)}
                    className="input-pixel w-full"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#101626] mb-1">Terms & Conditions</label>
                  <textarea
                    value={formData.copy?.terms_content || ''}
                    onChange={(e) => updateCopy('terms_content', e.target.value)}
                    className="input-pixel w-full"
                    rows={6}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fields Tab */}
        {activeTab === 'fields' && (
          <div className="card p-6 space-y-6">
            <div>
              <h3 className="font-bold text-[#101626] uppercase mb-4 border-b-2 border-[#101626] pb-2">
                Standard Fields
              </h3>
              <p className="text-sm text-[#101626]/60 mb-4">
                Toggle standard fields on/off for the friend signup form
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.standard_fields?.phone ?? true}
                    onChange={(e) => updateStandardFields('phone', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="font-bold text-[#101626]">Phone Number</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.standard_fields?.child_grade ?? true}
                    onChange={(e) => updateStandardFields('child_grade', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="font-bold text-[#101626]">Child&apos;s Grade</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 border-b-2 border-[#101626] pb-2">
                <h3 className="font-bold text-[#101626] uppercase">Custom Fields</h3>
                <button
                  onClick={addCustomField}
                  className="text-sm px-3 py-1 bg-[#3533ff] text-white border-2 border-[#101626] font-bold uppercase"
                >
                  + Add Field
                </button>
              </div>

              {(formData.custom_fields || []).length === 0 ? (
                <p className="text-[#101626]/60 text-center py-8">
                  No custom fields. Click &quot;Add Field&quot; to create one.
                </p>
              ) : (
                <div className="space-y-4">
                  {(formData.custom_fields || []).map((field, index) => (
                    <div key={index} className="border-2 border-[#101626] p-4 bg-[#a3e1f0]/10">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold text-[#101626]/60 uppercase">
                          Field {index + 1}
                        </span>
                        <button
                          onClick={() => removeCustomField(index)}
                          className="text-[#ff3333] font-bold text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#101626] mb-1">
                            Field Name (internal)
                          </label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateCustomField(index, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                            className="input-pixel w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#101626] mb-1">
                            Label (shown to user)
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateCustomField(index, { label: e.target.value })}
                            className="input-pixel w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#101626] mb-1">
                            Field Type
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) => updateCustomField(index, { type: e.target.value as CustomFormField['type'] })}
                            className="input-pixel w-full text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="tel">Phone</option>
                            <option value="select">Dropdown</option>
                            <option value="textarea">Text Area</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#101626] mb-1">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => updateCustomField(index, { placeholder: e.target.value })}
                            className="input-pixel w-full text-sm"
                          />
                        </div>
                        {field.type === 'select' && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-[#101626] mb-1">
                              Options (one per line)
                            </label>
                            <textarea
                              value={(field.options || []).join('\n')}
                              onChange={(e) => updateCustomField(index, { options: e.target.value.split('\n').filter(Boolean) })}
                              className="input-pixel w-full text-sm"
                              rows={3}
                            />
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-bold text-[#101626]">Required field</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HubSpot Tab */}
        {activeTab === 'hubspot' && (
          <div className="card p-6 space-y-6">
            <div className="bg-[#a3e1f0]/30 border-2 border-[#101626] p-4">
              <p className="text-sm text-[#101626]">
                <strong>Note:</strong> Each campaign can have its own HubSpot form. Leave blank to skip HubSpot integration for this campaign.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#101626] mb-1 uppercase">
                HubSpot Portal ID
              </label>
              <input
                type="text"
                value={formData.hubspot_portal_id || ''}
                onChange={(e) => updateFormData({ hubspot_portal_id: e.target.value || null })}
                className="input-pixel w-full"
                placeholder="e.g., 12345678"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#101626] mb-1 uppercase">
                Referrer Form GUID
              </label>
              <input
                type="text"
                value={formData.hubspot_form_guid || ''}
                onChange={(e) => updateFormData({ hubspot_form_guid: e.target.value || null })}
                className="input-pixel w-full"
                placeholder="e.g., abc123de-f456-..."
              />
              <p className="text-sm text-[#101626]/60 mt-1">
                Form used when a referrer registers
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#101626] mb-1 uppercase">
                Friend Signup Form GUID
              </label>
              <input
                type="text"
                value={formData.hubspot_friend_form_guid || ''}
                onChange={(e) => updateFormData({ hubspot_friend_form_guid: e.target.value || null })}
                className="input-pixel w-full"
                placeholder="e.g., abc123de-f456-..."
              />
              <p className="text-sm text-[#101626]/60 mt-1">
                Separate form for referred friends — used for follow-up comms
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
