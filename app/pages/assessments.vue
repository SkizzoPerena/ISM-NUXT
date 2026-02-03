<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const { data, status } = await useAsyncData(
  'assessments',
  () => $fetch('https://noteworthy-z9k0.onrender.com/api/admin/assessments', {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Assessments API Response:', response._data)
    }
  }),
  {
    transform: (response: any): Assessment[] => {
      const assessmentData = response?.data || response?.assessments || response;
      if (!Array.isArray(assessmentData)) {
        return [];
      }
      return assessmentData
        .map((assessment: any) => {
          if (!assessment || !assessment._id || !assessment.title) {
            return null;
          }
          return {
            _id: assessment._id,
            createdAt: assessment.createdAt,
            instructions: assessment.instructions || '',
            title: assessment.title,
          };
        })
        .filter((assessment): assessment is Assessment => assessment !== null);
    },
    lazy: false,
  }
)

const UButton = resolveComponent('UButton')
const NuxtLink = resolveComponent('NuxtLink')

type Assessment = {
  _id: string
  title: string
  createdAt: string
  instructions: string
}

const assessmentcolumns: TableColumn<Assessment>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => h(NuxtLink, { to: `/details-assessment?id=${row.original._id}`, class: 'font-medium hover:underline' }, { default: () => row.getValue('title') })
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

const table = useTemplateRef('table')

// FORM SCRIPT 

const state = reactive({
  title: undefined,
  instructions: undefined
})

type Schema = typeof state

function validate(state: Partial<Schema>): FormError[] {
  const errors = []
  if (!state.title) errors.push({ path: 'title', message: 'Required' })
  if (!state.instructions) errors.push({ path: 'instructions', message: 'Required' })
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
        <div class="text-lg font-bold">Assessments</div>
        <div style="margin-left: auto">
          <UInput :model-value="table?.tableApi?.getColumn('title')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search assessments..."
            @update:model-value="table?.tableApi?.getColumn('title')?.setFilterValue($event)" />

          <UModal :dismissible="false" title="Add New Assessment">

            <UButton label="Add New Assessment" />

            <template #body>
              <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField label="Title" name="title" required block>
                  <UInput v-model="state.title" placeholder="e.g., Quarterly Skills Review" class="w-full" />
                </UFormField>

                <UFormField label="Instructions" name="instructions" required block>
                  <UTextarea v-model="state.instructions" placeholder="Provide instructions for this assessment..."
                    class="w-full" />
                </UFormField>

                <UButton type="submit" block>
                  Add Assessment
                </UButton>
              </UForm>
            </template>

          </UModal>

        </div>
      </div>
      
      <UTable ref="table" v-model:expanded="expanded" :data="data || []" :columns="assessmentcolumns"
        :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }"
        class="flex-1 mt-4 border-t border-default" :loading="status === 'pending'">
        <template #expanded="{ row }">
          <p class="p-4">{{ row.original.instructions }}</p>
        </template>
      </UTable>

    </UPageCard>
  </UContainer>

</template>
