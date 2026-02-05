<script lang="ts" setup>
import { ref, watch } from 'vue'

definePageMeta({
    layout: 'dashboard',
})

const assessment = ref({
    title: '',
    instructions: '',
    teacherId: '',
    rubricId: ''
})

type TeacherInfo = {
  _id: string;
  firstName: string;
  lastName:string;
}

type RubricInfo = {
  _id: string;
  title: string;
}

const teachers = ref<{ label: string, value: string }[]>([]);
const { data: teacherData, pending: teachersPending } = useAsyncData(
  'teachers',
  () => $fetch('https://noteworthy-z9k0.onrender.com/api/admin/teacher', {
    headers: {
      Authorization: `${useAuthToken().value}`
    }
  }),
  {
    transform: (response: any): TeacherInfo[] => {
      const teacherList = response?.data || response?.teachers || response;
      if (!Array.isArray(teacherList)) {
        return [];
      }
      return teacherList.map((teacher: any) => ({
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
      }));
    }
  }
);

watch(teacherData, (newTeacherData) => {
  if (newTeacherData) {
    teachers.value = newTeacherData.map(t => ({
      label: `${t.firstName} ${t.lastName}`,
      value: t._id
    }));
  }
}, { immediate: true });

const rubrics = ref<{ label: string, value: string }[]>([]);
const { data: rubricData, pending: rubricsPending } = useAsyncData(
  'rubrics',
  () => $fetch('https://noteworthy-z9k0.onrender.com/api/admin/rubrics', {
    headers: {
      Authorization: `${useAuthToken().value}`
    }
  }),
  {
    transform: (response: any): RubricInfo[] => {
      const rubricList = response?.data || response?.rubrics || response;
      if (!Array.isArray(rubricList)) {
        return [];
      }
      return rubricList.map((rubric: any) => ({
        _id: rubric._id,
        title: rubric.title,
      }));
    }
  }
);

watch(rubricData, (newRubricData) => {
  if (newRubricData) {
    rubrics.value = newRubricData.map(r => ({
      label: r.title,
      value: r._id
    }));
  }
}, { immediate: true });

type SupplementaryLink = {
  id: number;
  value: string;
};

const supplementaryLinks = ref<SupplementaryLink[]>([
  { id: Date.now(), value: '' }
]);

function addSupplementaryLink() {
  supplementaryLinks.value.push({ id: Date.now(), value: '' });
}

function removeSupplementaryLink(id: number) {
  // Keep at least one link field
  if (supplementaryLinks.value.length > 1) {
    supplementaryLinks.value = supplementaryLinks.value.filter(link => link.id !== id);
  }
}
</script>

<template>

    <UContainer>
        <UPageCard>
            <div class="text-lg font-bold">Create Assessment</div>
            <USeparator />
            <UPageGrid class="mt-4">
                <UForm>
                    <UFormGroup>

                        <UFormField label="Title" name="title" required block class="w-full">

                            <UInput label="Title" name="title" v-model="assessment.title" placeholder="Enter assessment title"
                                class="w-full" />
                        </UFormField>

                        <UFormField label="Assigned Teacher" name="teacher" required class="mt-4">
                            <USelect v-model="assessment.teacherId"
                                placeholder="Select a teacher"
                                :items="teachers"
                                option-attribute="label"
                                value-attribute="value"
                                :loading="teachersPending"
                                class="w-full"
                                />
                        </UFormField>

                        <UFormField label="Instructions" name="instructions" required class="mt-4">
                            <UTextarea v-model="assessment.instructions" placeholder="Enter assessment instructions"
                                class="w-full" />
                        </UFormField>
                    </UFormGroup>
                </UForm>

                <div>
                    
                        <UFormField label="Assign Rubric" name="rubric" required class="">
                            <USelect v-model="assessment.rubricId"
                                placeholder="Select a rubric"
                                :items="rubrics"
                                option-attribute="label"
                                value-attribute="value"
                                :loading="rubricsPending"
                                class="w-full" block
                                />
                        </UFormField>
                        <UFormField label="Supplementary image (optional)" name="sup image" class="mt-4"></UFormField>
                    <UFileUpload label="Click or drag to upload image" name="upload image" class="w-full" />
                </div>
                
                <div>
                    <UFormField label="Supplementary links (optional)"/>
                    <div v-for="(link, index) in supplementaryLinks" :key="link.id" class="flex items-center gap-2 mb-2">
                        <UInput v-model="link.value" placeholder="https://example.com" class="flex-1" />
                        <UButton 
                            @click="removeSupplementaryLink(link.id)" 
                            icon="i-lucide-x" 
                            color="error" 
                            variant="ghost" 
                            :disabled="supplementaryLinks.length <= 1"
                        />
                    </div>
                    <UButton @click="addSupplementaryLink" variant="subtle" icon="i-lucide-square-plus" block>Add new link</UButton>
                </div>

            </UPageGrid>
        </UPageCard>

        <UPageCard class="mt-4">
            <UButton size="lg" icon="i-lucide-circle-check" block>Finish Creating Assessment</UButton>
        </UPageCard>


    </UContainer>

</template>