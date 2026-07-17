"use client";

import { useId } from "react";
import { Phone, Mail, Globe } from "lucide-react";
import { ContactData } from "@/lib/validation/onboarding-group1";

interface ContactStepProps {
  data: ContactData;
  onChange: (updates: Partial<ContactData>) => void;
  errors: Record<string, string>;
}

export default function ContactStep({ data, onChange, errors }: ContactStepProps) {
  const phoneId = useId();
  const emailId = useId();
  const webId = useId();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Contact Information</h2>
        <p className="text-sm text-gray-500">Configure how patients and platforms communicate with your clinic.</p>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mobile Number */}
          <div>
            <label htmlFor={phoneId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id={phoneId}
                type="tel"
                value={data.mobile}
                onChange={(e) => onChange({ mobile: e.target.value })}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.mobile ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
                }`}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            {errors.mobile && <p className="text-xs text-red-500 mt-1 font-medium">{errors.mobile}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor={emailId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Business Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id={emailId}
                type="email"
                value={data.email}
                onChange={(e) => onChange({ email: e.target.value })}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.email ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
                }`}
                placeholder="clinic@example.com"
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
          </div>
        </div>

        {/* Website */}
        <div>
          <label htmlFor={webId} className="block text-sm font-semibold text-gray-700 mb-1.5">
            Website URL <span className="text-xs font-normal text-gray-400">(Optional)</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              id={webId}
              type="url"
              value={data.website}
              onChange={(e) => onChange({ website: e.target.value })}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.website ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="https://yourclinic.com"
            />
          </div>
          {errors.website && <p className="text-xs text-red-500 mt-1 font-medium">{errors.website}</p>}
        </div>

        {/* Social Presence Fields */}
        <div className="border-t border-gray-150 pt-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3.5">Social Presence Channels (Optional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Facebook</label>
              <input
                type="url"
                value={data.facebook}
                onChange={(e) => onChange({ facebook: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.facebook ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
                }`}
                placeholder="https://facebook.com/yourpage"
              />
              {errors.facebook && <p className="text-xs text-red-500 mt-1 font-medium">{errors.facebook}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Instagram</label>
              <input
                type="url"
                value={data.instagram}
                onChange={(e) => onChange({ instagram: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.instagram ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
                }`}
                placeholder="https://instagram.com/yourprofile"
              />
              {errors.instagram && <p className="text-xs text-red-500 mt-1 font-medium">{errors.instagram}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">LinkedIn</label>
              <input
                type="url"
                value={data.linkedin}
                onChange={(e) => onChange({ linkedin: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.linkedin ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
                }`}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              {errors.linkedin && <p className="text-xs text-red-500 mt-1 font-medium">{errors.linkedin}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">WhatsApp Business</label>
              <input
                type="tel"
                value={data.whatsapp}
                onChange={(e) => onChange({ whatsapp: e.target.value })}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                  errors.whatsapp ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
                }`}
                placeholder="+15551234567"
              />
              {errors.whatsapp && <p className="text-xs text-red-500 mt-1 font-medium">{errors.whatsapp}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
