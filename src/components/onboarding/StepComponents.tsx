"use client";

import React from "react";
import {
  Building2, User, Phone, Mail, Globe, MapPin, 
  Image as ImageIcon, X, Plus, Tag, Languages, Sparkles,
  Clock, FileText, Upload, Shield, Stethoscope, Calendar, Check
} from "lucide-react";
import SpecializationDropdown from "@/components/SpecializationDropdown";
import { OTHER_SPECIALIZATION } from "@/lib/data/specializations";
import { 
  BasicInfo, Contact, ClinicDetails, Consultation, 
  AvailabilityDay, BreakItem, PublicProfile, VerificationDoc, LocationState, daysOfWeek 
} from "@/types/onboarding";

export const Step1BasicInfo = ({ basicInfo, setBasicInfo }: { basicInfo: BasicInfo, setBasicInfo: any }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Basic Information</h2>
    <p className="text-gray-600 mb-6">Tell us about your clinic and professional credentials</p>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name</label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={basicInfo.clinicName} onChange={(e) => setBasicInfo({ ...basicInfo, clinicName: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="HealthCare Medical Center" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={basicInfo.doctorName} onChange={(e) => setBasicInfo({ ...basicInfo, doctorName: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Dr. John Smith" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
        <SpecializationDropdown value={basicInfo.specialization} customValue={basicInfo.customSpecialization} onChange={(val: string) => setBasicInfo({ ...basicInfo, specialization: val })} onCustomChange={(val: string) => setBasicInfo({ ...basicInfo, customSpecialization: val })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={basicInfo.qualification} onChange={(e) => setBasicInfo({ ...basicInfo, qualification: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="MBBS, MD" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
          <input type="number" min="0" value={basicInfo.experienceYears} onChange={(e) => setBasicInfo({ ...basicInfo, experienceYears: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="10" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Registration / License Number</label>
        <input type="text" value={basicInfo.registrationNumber} onChange={(e) => setBasicInfo({ ...basicInfo, registrationNumber: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="MD-12345" required />
      </div>
    </div>
  </div>
);

export const Step2Contact = ({ contact, setContact }: { contact: Contact, setContact: any }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Contact Information</h2>
    <p className="text-gray-600 mb-6">How patients can reach you</p>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="tel" value={contact.mobile} onChange={(e) => setContact({ ...contact, mobile: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="+1 555 123 4567" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="clinic@example.com" required />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Website (Optional)</label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="url" value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://yourclinic.com" />
        </div>
      </div>
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Social Links (Optional)</p>
        <div className="grid grid-cols-2 gap-4">
          <input type="url" value={contact.facebook} onChange={(e) => setContact({ ...contact, facebook: e.target.value })} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Facebook URL" />
          <input type="url" value={contact.instagram} onChange={(e) => setContact({ ...contact, instagram: e.target.value })} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Instagram URL" />
          <input type="url" value={contact.linkedin} onChange={(e) => setContact({ ...contact, linkedin: e.target.value })} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="LinkedIn URL" />
          <input type="tel" value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="WhatsApp Number" />
        </div>
      </div>
    </div>
  </div>
);

export const Step4ClinicDetails = ({ clinicDetails, setClinicDetails, logoInputRef, coverInputRef, galleryInputRef, handleLogoUpload, handleCoverUpload, handleGalleryUpload, removeGalleryImage, newLanguage, setNewLanguage, addLanguage }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Clinic Details</h2>
    <p className="text-gray-600 mb-6">Add visual and descriptive information about your clinic</p>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">About Clinic</label>
        <textarea value={clinicDetails.about} onChange={(e) => setClinicDetails({ ...clinicDetails, about: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Tell patients what makes your clinic special..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Logo</label>
          <div className="flex items-center gap-3">
            {clinicDetails.logoUrl ? (
              <div className="relative">
                <img src={clinicDetails.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                <button type="button" onClick={() => setClinicDetails((prev: any) => ({ ...prev, logoUrl: "" }))} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => logoInputRef.current?.click()} className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-400 transition-colors">
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </button>
            )}
            <button type="button" onClick={() => logoInputRef.current?.click()} className="text-sm text-primary-600 hover:text-primary-700">Upload Logo</button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
          <div className="flex items-center gap-3">
            {clinicDetails.coverImageUrl ? (
              <div className="relative">
                <img src={clinicDetails.coverImageUrl} alt="Cover" className="w-20 h-16 rounded-lg object-cover border border-gray-200" />
                <button type="button" onClick={() => setClinicDetails((prev: any) => ({ ...prev, coverImageUrl: "" }))} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => coverInputRef.current?.click()} className="w-20 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-400 transition-colors">
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </button>
            )}
            <button type="button" onClick={() => coverInputRef.current?.click()} className="text-sm text-primary-600 hover:text-primary-700">Upload Cover</button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Gallery Photos</label>
        <div className="flex flex-wrap gap-3 mb-2">
          {clinicDetails.galleryImages.map((img: string, idx: number) => (
            <div key={idx} className="relative">
              <img src={img} alt={`Gallery ${idx + 1}`} className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
              <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button type="button" onClick={() => galleryInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-400 transition-colors">
            <Plus className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Languages Spoken</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {clinicDetails.languagesSpoken.map((lang: string, idx: number) => (
            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
              <Languages className="w-3 h-3" />
              {lang}
              <button type="button" onClick={() => setClinicDetails((prev: any) => ({ ...prev, languagesSpoken: prev.languagesSpoken.filter((_: any, i: number) => i !== idx) }))} className="text-primary-400 hover:text-primary-600"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLanguage(); } }} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. English, Spanish, French" />
          <button type="button" onClick={addLanguage} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  </div>
);

export const Step5Consultation = ({ consultation, setConsultation }: { consultation: Consultation, setConsultation: any }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Consultation Settings</h2>
    <p className="text-gray-600 mb-6">Configure your appointment and consultation preferences</p>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee ($)</label>
          <p className="text-xs text-gray-500 mb-1">Display only - no online payment</p>
          <input type="number" min="0" step="0.01" value={consultation.fee} onChange={(e) => setConsultation({ ...consultation, fee: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="100" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Type</label>
          <select value={consultation.consultationType} onChange={(e) => setConsultation({ ...consultation, consultationType: e.target.value as "in_person" | "online" | "both" })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="in_person">In-Person Only</option>
            <option value="online">Online Only</option>
            <option value="both">Both In-Person & Online</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (min)</label>
          <input type="number" min="5" step="5" value={consultation.slotDuration} onChange={(e) => setConsultation({ ...consultation, slotDuration: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="30" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Time (min)</label>
          <input type="number" min="0" step="5" value={consultation.bufferTime} onChange={(e) => setConsultation({ ...consultation, bufferTime: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Booking Mode</label>
          <select value={consultation.bookingMode} onChange={(e) => setConsultation({ ...consultation, bookingMode: e.target.value as "auto" | "manual" })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="auto">Auto Confirm</option>
            <option value="manual">Manual Approval</option>
          </select>
        </div>
      </div>
    </div>
  </div>
);

export const Step6Availability = ({ availability, setAvailability, breaks, setBreaks }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Working Hours & Availability</h2>
    <p className="text-gray-600 mb-6">Set your weekly schedule and break times</p>
    <div className="space-y-3">
      {daysOfWeek.map((day) => (
        <div key={day.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <input type="checkbox" checked={availability[day.id].enabled} onChange={(e) => setAvailability({ ...availability, [day.id]: { ...availability[day.id], enabled: e.target.checked } })} className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500" />
          <span className="w-24 font-medium text-gray-700">{day.name}</span>
          {availability[day.id].enabled && (
            <>
              <div className="relative flex-1">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="time" value={availability[day.id].start} onChange={(e) => setAvailability({ ...availability, [day.id]: { ...availability[day.id], start: e.target.value } })} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <span className="text-gray-400">to</span>
              <div className="relative flex-1">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="time" value={availability[day.id].end} onChange={(e) => setAvailability({ ...availability, [day.id]: { ...availability[day.id], end: e.target.value } })} className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
    <div className="mt-6">
      <p className="text-sm font-medium text-gray-700 mb-2">Break Times (Optional)</p>
      {breaks.length > 0 && (
        <div className="space-y-2 mb-3">
          {breaks.map((b: BreakItem, idx: number) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
              <span className="flex-1">{daysOfWeek.find(d => d.id === b.day)?.name}</span>
              <span>{b.start} - {b.end}</span>
              <span className="text-gray-500">{b.title}</span>
              <button type="button" onClick={() => setBreaks(breaks.filter((_: any, i: number) => i !== idx))} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setBreaks([...breaks, { day: 0, start: "12:00", end: "13:00", title: "Lunch" }])} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"><Plus className="w-4 h-4" /> Add Break</button>
    </div>
  </div>
);

export const Step7PublicProfile = ({ publicProfile, setPublicProfile, newService, setNewService, addService, newFacility, setNewFacility, addFacility }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Public Profile & SEO</h2>
    <p className="text-gray-600 mb-6">Configure your public-facing clinic page</p>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Slug (URL)</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">/clinic/</span>
          <input type="text" value={publicProfile.slug} onChange={(e) => setPublicProfile({ ...publicProfile, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") })} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="healthcare-medical-center" required />
        </div>
        <p className="text-xs text-gray-500 mt-1">This will be your public URL: /clinic/{publicProfile.slug || "your-slug"}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Short Bio</label>
        <textarea value={publicProfile.bio} onChange={(e) => setPublicProfile({ ...publicProfile, bio: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="A brief introduction about yourself and your practice..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Services Offered</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {publicProfile.services.map((s: string, idx: number) => (
            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              <Tag className="w-3 h-3" />{s}
              <button type="button" onClick={() => setPublicProfile((prev: any) => ({ ...prev, services: prev.services.filter((_: any, i: number) => i !== idx) }))} className="text-blue-400 hover:text-blue-600"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newService} onChange={(e) => setNewService(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. General Checkup, Vaccination" />
          <button type="button" onClick={addService} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Facilities / Amenities</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {publicProfile.facilities.map((f: string, idx: number) => (
            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
              <Sparkles className="w-3 h-3" />{f}
              <button type="button" onClick={() => setPublicProfile((prev: any) => ({ ...prev, facilities: prev.facilities.filter((_: any, i: number) => i !== idx) }))} className="text-green-400 hover:text-green-600"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newFacility} onChange={(e) => setNewFacility(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFacility(); } }} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Parking, WiFi, Wheelchair Access" />
          <button type="button" onClick={addFacility} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  </div>
);

export const Step8Documents = ({ documents, setDocuments, docInputRef, handleDocUpload }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Verification Documents</h2>
    <p className="text-gray-600 mb-6">Upload your private documents for verification (Optional, but recommended)</p>
    <div className="space-y-3">
      {documents.length > 0 && (
        <div className="space-y-2 mb-4">
          {documents.map((doc: VerificationDoc, idx: number) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{doc.fileName}</p>
                <p className="text-xs text-gray-500">{(doc.fileSize / 1024).toFixed(1)} KB</p>
              </div>
              <select value={doc.type} onChange={(e) => setDocuments((docs: VerificationDoc[]) => docs.map((d, i) => i === idx ? { ...d, type: e.target.value } : d))} className="text-sm px-2 py-1 border border-gray-200 rounded-lg">
                <option value="license">Medical License</option>
                <option value="id_card">National ID / Passport</option>
                <option value="clinic_proof">Clinic Proof</option>
                <option value="certificate">Certificate</option>
                <option value="other">Other</option>
              </select>
              <button type="button" onClick={() => setDocuments((docs: VerificationDoc[]) => docs.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => docInputRef.current?.click()} className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-primary-400 transition-colors">
        <Upload className="w-8 h-8 text-gray-400 mb-2" />
        <span className="text-sm text-gray-600">Click to upload documents</span>
        <span className="text-xs text-gray-400 mt-1">Medical License, National ID, Clinic Proof, Certificates (PDF, JPG, PNG)</span>
      </button>
      <input ref={docInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleDocUpload} />
      <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>Your documents are stored securely and privately. They will only be visible to admin reviewers for verification purposes.</p>
      </div>
    </div>
  </div>
);

export const Step9Review = ({ basicInfo, location, consultation, availability, publicProfile, documents }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Complete</h2>
    <p className="text-gray-600 mb-6">Please review your information before completing</p>
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Stethoscope className="w-4 h-4" /> Basic Info</h3>
        <dl className="text-sm space-y-1">
          <div className="flex justify-between"><dt className="text-gray-500">Clinic:</dt><dd className="font-medium">{basicInfo.clinicName}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Doctor:</dt><dd className="font-medium">{basicInfo.doctorName}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Specialization:</dt><dd className="font-medium">{basicInfo.specialization === OTHER_SPECIALIZATION ? basicInfo.customSpecialization : basicInfo.specialization}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Experience:</dt><dd className="font-medium">{basicInfo.experienceYears} years</dd></div>
        </dl>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" /> Location</h3>
        <dl className="text-sm space-y-1">
          <div className="flex justify-between"><dt className="text-gray-500">City:</dt><dd className="font-medium">{location.city}, {location.country}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Address:</dt><dd className="font-medium text-right">{location.address}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Timezone:</dt><dd className="font-medium text-right">{location.timezone}</dd></div>
        </dl>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Calendar className="w-4 h-4" /> Consultation</h3>
        <dl className="text-sm space-y-1">
          <div className="flex justify-between"><dt className="text-gray-500">Fee:</dt><dd className="font-medium">${consultation.fee}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Type:</dt><dd className="font-medium">{consultation.consultationType === "in_person" ? "In-Person" : consultation.consultationType === "online" ? "Online" : "Both"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Slot:</dt><dd className="font-medium">{consultation.slotDuration} min</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Working Days:</dt><dd className="font-medium">{Object.values(availability).filter((a: any) => a.enabled).length} days/week</dd></div>
        </dl>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Globe className="w-4 h-4" /> Public Profile</h3>
        <dl className="text-sm space-y-1">
          <div className="flex justify-between"><dt className="text-gray-500">URL:</dt><dd className="font-medium">/clinic/{publicProfile.slug}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Services:</dt><dd className="font-medium">{publicProfile.services.length} services</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Facilities:</dt><dd className="font-medium">{publicProfile.facilities.length} facilities</dd></div>
        </dl>
      </div>
      {documents.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Shield className="w-4 h-4" /> Documents</h3>
          <p className="text-sm text-gray-600">{documents.length} document(s) uploaded for verification</p>
        </div>
      )}
    </div>
  </div>
);

export const Step10Success = ({ router }: any) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Check className="w-8 h-8 text-primary-600" />
    </div>
    <h2 className="text-xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
    <p className="text-gray-600 mb-2">Your clinic is ready. You can now start accepting appointments.</p>
    <p className="text-sm text-gray-500 mb-6">A 14-day free trial has been activated for your account.</p>
    <button onClick={() => router.push("/doctor/dashboard")} className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors">Go to Dashboard</button>
  </div>
);
