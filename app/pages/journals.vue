<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent, computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { TabsItem } from '@nuxt/ui'

const { data, status } = await useAsyncData('journals',
  () => $fetch('https://noteworthy-z9k0.onrender.com/api/admin/journals', {
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
    transform: (response: any): Journals[] => {
      const journalData = response?.data || response?.journals || response;
      if (!Array.isArray(journalData)) {
        return [];
      }

      // The /api/admin/journals endpoint returns a direct list of journal templates.
      // We map over them to ensure the data structure is consistent and valid for the table.
      return journalData
        .map((journal: any) => {
          // Basic validation to skip malformed entries
          if (!journal || !journal._id || !journal.title) {
            return null;
          }
          return {
            _id: journal._id,
            createdAt: journal.createdAt,
            description: journal.description || '', // Ensure description is a string
            title: journal.title,
          };
        })
        .filter((journal): journal is Journals => journal !== null); // Filter out any nulls
    },
    lazy: false,
  }
)

const UButton = resolveComponent('UButton')
const NuxtLink = resolveComponent('NuxtLink')

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
    header: 'Title',
    cell: ({ row }) => h(NuxtLink, { to: `/details-journal?id=${row.original._id}`,  class: 'text-primary font-medium hover:underline' }, { default: () => row.getValue('title') })
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
      return `Created: ${formattedDate}`
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

const table1 = useTemplateRef('table1')

// FORM SCRIPT 

const state = reactive({
  title: undefined,
  description: undefined
})

type Schema = typeof state

function validate(state: Partial<Schema>): FormError[] {
  const errors = []
  if (!state.title) errors.push({ path: 'title', message: 'Required' })
  if (!state.description) errors.push({ path: 'description', message: 'Required' })
  return errors
}

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
  console.log(event.data)
}

// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

                  <div class="flex items-center gap-4 mb-4">
        <div class="text-lg font-bold">Journals</div>
        <div style="margin-left: auto">
          <UInput :model-value="table1?.tableApi?.getColumn('title')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search journals..."
            @update:model-value="table1?.tableApi?.getColumn('title')?.setFilterValue($event)" />

          <UModal :dismissible="false" title="Add New Journal">

            <UButton label="Add New Journal" />

            <template #body>
              <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField label="Title" name="title" required block>
                  <UInput v-model="state.title" placeholder="e.g., Weekly Practice Routine" class="w-full" />
                </UFormField>

                <UFormField label="Description" name="description" required block>
                  <UTextarea v-model="state.description" placeholder="Describe the journal's purpose..." class="w-full" />
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
            :ui="{ tr: 'data-[expanded=true]:bg-elevated/50',   }" class="flex-1" :loading="status === 'pending'">
            <template #expanded="{ row }">
              <p class="p-4">{{ row.original.description }}</p>
            </template>
          </UTable>

    </UPageCard>
  </UContainer>

</template>
