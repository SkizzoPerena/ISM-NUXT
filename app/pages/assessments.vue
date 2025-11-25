<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { TabsItem } from '@nuxt/ui'

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

type Assessments = {
  id: string
  date: string
}

const classassessmentdata = ref<Assessments[]>([
  {
    id: 'Class-wide Assessment 1',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Class-wide Assessment 2',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Class-wide Assessment 3',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Class-wide Assessment 4',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Class-wide Assessment 5',
    date: 'Due Oct 10, 2026, 20:15',
  },
])

const indiassessmentdata = ref<Assessments[]>([
  {
    id: 'Individual Assessment 1',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Individual Assessment 2',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Individual Assessment 3',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Individual Assessment 4',
    date: 'Due Oct 10, 2026, 20:15',
  },
  {
    id: 'Individual Assessment 5',
    date: 'Due Oct 10, 2026, 20:15',
  },
])

const assessmentcolumns: TableColumn<Assessments>[] = [
  {
    accessorKey: 'id',
    header: '',
  },
  {
    accessorKey: 'date',
    header: 'Date',
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

      <div class="text-lg font-bold">Assessments</div>
      <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">

        <!-- CLASSWIDE TAB -->
        <template #classwide="{ item }">

          <div class=flex>
            <div style="margin-left: auto">

              <UInput :model-value="table?.tableApi?.getColumn('id')?.getFilterValue() as string" class="max-w-sm mr-5"
                placeholder="Search assessments..."
                @update:model-value="table?.tableApi?.getColumn('id')?.setFilterValue($event)" />

              <UModal :dismissible="false" title="Add Assessment">

                <UButton label="Add Assessment" />

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
                      Add Assessment
                    </UButton>
                  </UForm>
                </template>

              </UModal>




            </div>
          </div>







          <UTable ref="table" v-model:expanded="expanded" :data="classassessmentdata" :columns="assessmentcolumns"
            :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1">
            <template #expanded="{ row }">
              <pre>Insert assessment description here</pre>
            </template>
          </UTable>

        </template>

        <template #individual>

          <div class=flex>
            <div style="margin-left: auto">

              <UInput :model-value="table1?.tableApi?.getColumn('id')?.getFilterValue() as string" class="max-w-sm mr-5"
                placeholder="Search assessments..."
                @update:model-value="table1?.tableApi?.getColumn('id')?.setFilterValue($event)" />

              <UModal :dismissible="false" title="Add Assessment">

                <UButton label="Add Assessment" />

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
                      Add Assessment
                    </UButton>
                  </UForm>
                </template>

              </UModal>




            </div>
          </div>

          <UTable ref="table1" v-model:expanded="expanded" :data="indiassessmentdata" :columns="assessmentcolumns"
            :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1">
            <template #expanded="{ row }">
              <pre>Insert assessment description here</pre>
            </template>
          </UTable>


        </template>

      </UTabs>


    </UPageCard>
  </UContainer>

</template>
