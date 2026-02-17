<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 't-dashboard',
})

const { data, status } = await useAsyncData<Student[]>('students',
  async () => { // Make this function async to await nested fetches
    const studentListResponse = await $fetch<any>('https://noteworthy-z9k0.onrender.com/api/teacher/student', {
      headers: {
        Authorization: `${useAuthToken().value}`
      },
      onResponse({ response }) {
        console.log('API Response (Student List):', response._data)
      }
    });

    const studentData = studentListResponse?.data || studentListResponse?.students || studentListResponse
    const rows = Array.isArray(studentData) ? studentData : []

    // For each student, fetch their assigned instruments
    const studentsWithEnrichedData = await Promise.all(rows.map(async (student: any) => {
      // Fetch instruments for the current student
      const instrumentResponse = await $fetch<any>(`https://noteworthy-z9k0.onrender.com/api/teacher/student-instrument/${student._id}`, {
        headers: {
          Authorization: `${useAuthToken().value}`
        },
        onResponse({ response }) {
          console.log(`API Response (Instruments for ${student._id}):`, response._data)
        }
      });
      const instrumentData = instrumentResponse.data || instrumentResponse.studentInstruments || instrumentResponse;
      const assignedInstruments = Array.isArray(instrumentData) ? instrumentData.map((item: any) => ({
        _id: item._id,
        instrumentName: item.instrument.instrumentName,
        proficiency: formatProficiency(item.proficiency),
      })) : [];


      return {
        _id: student._id,
        assignedInstruments: assignedInstruments, // This will now contain the fetched instruments
        assignedSections: student.assignedSections,
        email: student.email,
        firstName: student.firstName, // Pass through firstName for linking
        lastName: student.lastName,   // Pass through lastName for linking
        name: student.firstName + ' ' + student.lastName,
        gender: student.gender,
        profileImageURL: student.profileImageURL,
      }
    }));

    return studentsWithEnrichedData;
  },
  {
    // The transform function is now integrated directly into the async fetcher
    // No separate transform needed here, as the data is already shaped.
    lazy: false, // Set to false to ensure data is fetched on initial load
  }
)

type Student = {
  _id: string
  assignedInstruments: any[]
  assignedSections: SectionInfo[] // Changed to SectionInfo[] for better type accuracy
  email: string
  name: string
  firstName: string // Added for profile page linking
  lastName: string // Added for profile page linking
  gender: string
  profileImageURL: string
}

type SectionInfo = {
  _id: string
  name: string
}

// Helper function to format proficiency strings
function formatProficiency(proficiency: string): string {
  if (!proficiency) return '';
  const lower = proficiency.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getProficiencyColor(proficiency: string) {
  if (!proficiency) return 'neutral'

  const lower = proficiency.toLowerCase()
  switch (lower) {
    case 'beginner':
      return 'secondary'
    case 'intermediate':
      return 'primary'
    case 'advanced':
    case 'expert':
      return 'warning'
    default:
      return 'neutral'
  }
}

type InstrumentInfo = {
  _id: string
  instrumentName: string
  proficiency: string
}

const UAvatar = resolveComponent('UAvatar')
const NuxtLink = resolveComponent('NuxtLink')


type Section = {
  _id: string
  name: string
  // ... other fields
}

const columns: TableColumn<Student>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.profileImageURL, alt: row.original.name }),
      h('div', undefined, [ // Wrap the student's name in a NuxtLink
        h(NuxtLink, { to: `/profile-student?id=${row.original._id}`, class: 'text-primary font-medium hover:underline'}, { default: () => row.getValue('name') }),
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, row.original.email)
      ])
    ])
  },
  {
    accessorKey: '_id',
    header: 'Student #',
    cell: ({ row }) => `#${row.getValue('_id')}`
  },
  {
    accessorKey: 'gender',
    header: 'Gender'
  },
    {
    accessorKey: 'assignedSections',
    header: 'Section',
    cell: ({ row }) => {
  const sections = row.getValue('assignedSections') as Section[]
  
  if (!sections || sections.length === 0) return 'No Section'
  return sections.map(section => section.name).join(', ')
  }
  },
    {
    accessorKey: 'assignedInstruments',
    header: 'Instruments',
    cell: ({ row }) => {
      const instruments = row.getValue('assignedInstruments') as InstrumentInfo[];
      if (!instruments || instruments.length === 0) {
        return h('span', 'No instruments');
      }
      return h('div', { class: 'space-y-1' }, instruments.map(instrument => {
        return h('span', { class: 'text-gray-900 dark:text-white block' }, [
          instrument.instrumentName,
          instrument.proficiency ? h(resolveComponent('UBadge'), {
            color: getProficiencyColor(instrument.proficiency),
            variant: 'subtle',
            class: 'ml-2'
          }, () => instrument.proficiency) : null
        ]);
      }));
    }
  },
]

// TABLE FILTER SCRIPT

const table = useTemplateRef('table')

const columnFilters = ref([
  {
    id: 'name',
    value: ''
  }
])

// END TABLE FILTER SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4">
        <div class="text-lg font-bold">Students</div>
        <div style="margin-left: auto">
          <UInput
            :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string"
            class="max-w-sm mr-5"
            placeholder="Search students..."
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)"
          />

        </div>
      </div><USeparator />


      <UTable ref="table" v-model:column-filters="columnFilters" sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1 max-h-[70vh]" />
    </UPageCard>
  </UContainer>

</template>
