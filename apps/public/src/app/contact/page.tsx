import React from 'react';
import { Mail, Phone, MapPin, Clock, Building, MessageSquare } from 'lucide-react';
import { getTenantConfig } from '@/lib/server-api';
import { ContactForm } from '@/components/contact-form';

export const metadata = {
  title: 'Contact Admissions & Campus | EduManage',
  description: 'Get in touch with institute admissions and student affairs.',
};

export default async function PublicContactPage() {
  const config = await getTenantConfig();
  const theme = config?.themeConfig;
  const name = config?.name || 'EduManage Institute';

  return (
    <div className="py-12 bg-slate-50/50 min-h-[calc(100vh-16rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-3">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Admissions & Campus Inquiries</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
            Get in Touch With {name}
          </h1>
          <p className="mt-2 text-base text-gray-600">
            Have questions regarding curriculum details, batch schedules, or fee payment structures? We are here to help.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details Card */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                Campus Location & Info
              </h3>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">Address</h5>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {theme?.address || 'Main Campus, Academic District'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">Phone</h5>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {theme?.contactPhone ? (
                        <a href={`tel:${theme.contactPhone}`} className="hover:underline">
                          {theme.contactPhone}
                        </a>
                      ) : (
                        'Admissions Hotline available during office hours'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">Email</h5>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {theme?.contactEmail ? (
                        <a href={`mailto:${theme.contactEmail}`} className="hover:underline">
                          {theme.contactEmail}
                        </a>
                      ) : (
                        'admissions@institute.edu'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">Office Hours</h5>
                    <p className="text-gray-600 text-xs mt-0.5">
                      Monday – Saturday: 9:00 AM – 6:00 PM<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Note */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
              <span className="font-bold block mb-1">Campus Visits</span>
              Admissions counseling is open for walk-in visits Monday through Friday. Prior appointment is recommended for one-on-one department head consultations.
            </div>
          </div>

          {/* Contact Inquiry Form */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
