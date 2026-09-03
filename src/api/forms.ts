import { api } from './client'

export type FormFieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'RADIO' | 'CHECKBOX'

export interface FormField {
  id?: string
  key: string
  label: string
  type: FormFieldType
  required?: boolean
  options?: string[]
  order?: number
}

export interface FormDef {
  id: string
  tenantId: string
  branchId: string | null
  name: string
  description: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  branch?: { id: string; name: string }
  fields: FormField[]
}

export interface FormSubmission {
  id: string
  tenantId: string
  formId: string
  submittedByUserId: string
  refNumber: string | null
  parentRefNumber: string | null
  data: Record<string, unknown>
  createdAt: string
  submittedBy?: { id: string; firstName: string; lastName: string; email: string }
}

export interface CreateFormInput {
  name: string
  description?: string | null
  branchId?: string | null
  fields: Array<
    Omit<FormField, 'id'> & {
      type: FormFieldType
      required?: boolean
      options?: string[]
      order?: number
    }
  >
}

export type UpdateFormInput = Partial<Omit<CreateFormInput, 'branchId'>>

export const formsApi = {
  list(query?: { branchId?: string; published?: boolean }) {
    return api.get<FormDef[]>('/forms', { params: query }).then((r) => r.data)
  },
  get(id: string) {
    return api.get<FormDef>(`/forms/${id}`).then((r) => r.data)
  },
  create(body: CreateFormInput) {
    return api.post<FormDef>('/forms', body).then((r) => r.data)
  },
  update(id: string, body: UpdateFormInput) {
    return api.patch<FormDef>(`/forms/${id}`, body).then((r) => r.data)
  },
  remove(id: string) {
    return api.delete(`/forms/${id}`).then(() => undefined)
  },
  publish(id: string) {
    return api.post(`/forms/${id}/publish`).then((r) => r.data)
  },
  listSubmissions(id: string) {
    return api.get<FormSubmission[]>(`/forms/${id}/submissions`).then((r) => r.data)
  },
  submit(id: string, data: Record<string, unknown>) {
    return api.post<FormSubmission>(`/forms/${id}/submissions`, { data }).then((r) => r.data)
  },
}