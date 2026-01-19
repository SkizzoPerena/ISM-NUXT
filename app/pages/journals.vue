<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent, computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { TabsItem } from '@nuxt/ui'

const { data, status } = await useAsyncData('journals',
  () => $fetch<Journals[]>('https://noteworthy-z9k0.onrender.com/api/admin/journals', {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      // This will log the raw response body.
      // Check your browser's developer console to see the structure of the data.
      console.log('API Response:', response._data)
    }
  }),
  {
    transform: (response: any) => {
      // The API might return data inside a property, e.g., { "data": [...] }
      // This line tries to find the array, assuming it might be nested.
      const journalData = response?.data || response?.journals || response
      const rows = Array.isArray(journalData) ? journalData : []
      return rows.map((journal: any) => ({
        _id: journal._id,
        createdAt: journal.createdAt,
        description: journal.description,
        title: journal.title
     }))
    },
    lazy: false,
  }
)

const UButton = resolveComponent('UButton')

definePageMeta({
  layout: 'dashboard',
})

const UBadge = resolveComponent('UBadge')

const items = [
  {
    label: 'Class-wide',
    description: 'Make changes to your account here. Click save when you\'re done.',
    icon: 'i-lucide-users',
    slot: 'classwide' as const
  },
  {
    label: 'Individual',
    description: 'Change your password here. After saving, you\'ll be logged out.',
    icon: 'i-lucide-text-search',
    slot: 'individual' as const
  },
] satisfies TabsItem[]

type Journals = {
  _id: string
  title: string
  createdAt: string
  description: string
}

const journalcolumns: TableColumn<Journals>[] = [
  {
    accessorKey: 'title',
    header: '',
    },
    {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => {
      const dateValue = row.getValue('createdAt') as string
      if (!dateValue) return ''
      const date = new Date(dateValue)
      // Format to something like: "Oct 10, 2026, 20:15"
      const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }).format(date)
      return `Due: ${formattedDate}`
    }
  },
  {
    id: 'expand',
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-chevron-down',
        square: true,
        'aria-label': 'Expand',
        ui: {
          leadingIcon: [
            'transition-transform',
            row.getIsExpanded() ? 'duration-200 rotate-180' : ''
          ]
        },
        onClick: () => row.toggleExpanded()
      })
  },
]
const expanded = ref({})

const table = useTemplateRef('table')

const table1 = useTemplateRef('table1')

// FORM SCRIPT 

const state = reactive({
  email: undefined,
  password: undefined
})

type Schema = typeof state

function validate(state: Partial<Schema>): FormError[] {
  const errors = []
  if (!state.email) errors.push({ name: 'email', message: 'Required' })
  if (!state.password) errors.push({ name: 'password', message: 'Required' })
  return errors
}

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
  console.log(event.data)
}

const SAAB = ref(['Male', 'Female'])

// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="text-lg font-bold">Journals</div>
      <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">

        <!-- CLASSWIDE TAB -->
        <template #classwide="{ item }">

          <div class=flex>
            <div style="margin-left: auto">

              <UInput :model-value="table?.tableApi?.getColumn('id')?.getFilterValue() as string" class="max-w-sm mr-5"
                placeholder="Search Journals..."
                @update:model-value="table?.tableApi?.getColumn('id')?.setFilterValue($event)" />

              <UModal :dismissible="false" title="Add Journal">

                <UButton label="Add Journal" />

                <template #body>
                  <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
                    <UFormField label="First Name" name="firstname" required block>
                      <UInput placeholder="Juan" class="w-full" />
                    </UFormField>

                    <UFormField label="Last Name" name="lastname" required block>
                      <UInput placeholder="Dela Cruz" class="w-full" />
                    </UFormField>


                    <UFormField label="Email Address" name="email" required block>
                      <UInput v-model="state.email" placeholder="user@email.com" class="w-full" />
                    </UFormField>

                    <UFormField label="Password" name="password" required>
                      <UInput v-model="state.password" type="password" placeholder="password" class="w-full" />
                    </UFormField>
                    <UFormField label="Sex assigned at birth" name="SAAB" required>
                      <USelect placeholder="Select sex" :items="SAAB" class="w-full" />
                    </UFormField>

                    <UButton type="submit" block>
                      Add Journal
                    </UButton>
                  </UForm>
                </template>

              </UModal>




            </div>
          </div>







          <UTable ref="table" v-model:expanded="expanded" :data="data || []" :columns="journalcolumns" 
            :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1 mt-4 border-t border-default" :loading="status === 'pending'">
            <template #expanded="{ row }">
              <p class="p-4">{{ row.original.description }}</p>
            </template>
          </UTable>

        </template>

        <template #individual>

          <div class=flex>
            <div style="margin-left: auto">

              <UInput :model-value="table1?.tableApi?.getColumn('id')?.getFilterValue() as string" class="max-w-sm mr-5"
                placeholder="Search Journals..."
                @update:model-value="table1?.tableApi?.getColumn('id')?.setFilterValue($event)" />

              <UModal :dismissible="false" title="Add Journal">

                <UButton label="Add Journal" />

                <template #body>
                  <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
                    <UFormField label="First Name" name="firstname" required block>
                      <UInput placeholder="Juan" class="w-full" />
                    </UFormField>

                    <UFormField label="Last Name" name="lastname" required block>
                      <UInput placeholder="Dela Cruz" class="w-full" />
                    </UFormField>


                    <UFormField label="Email Address" name="email" required block>
                      <UInput v-model="state.email" placeholder="user@email.com" class="w-full" />
                    </UFormField>

                    <UFormField label="Password" name="password" required>
                      <UInput v-model="state.password" type="password" placeholder="password" class="w-full" />
                    </UFormField>
                    <UFormField label="Sex assigned at birth" name="SAAB" required>
                      <USelect placeholder="Select sex" :items="SAAB" class="w-full" />
                    </UFormField>

                    <UButton type="submit" block>
                      Add Journal
                    </UButton>
                  </UForm>
                </template>

              </UModal>




            </div>
          </div>

          <UTable ref="table1" v-model:expanded="expanded" :data="data || []" :columns="journalcolumns"
            :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1 mt-4 border-t border-default" :loading="status === 'pending'">
            <template #expanded="{ row }">
              <p class="p-4">{{ row.original.description }}</p>
            </template>
          </UTable>


        </template>

      </UTabs>


    </UPageCard>
  </UContainer>

</template>
