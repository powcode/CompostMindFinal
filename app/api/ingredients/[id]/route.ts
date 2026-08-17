import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Handler untuk UPDATE quantity atau condition
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { quantity, condition } = body;

    const updates: Record<string, any> = {};

    if (quantity !== undefined) {
      if (typeof quantity !== 'number' || quantity < 1) {
        return NextResponse.json({ error: 'Quantity minimal 1.' }, { status: 400 });
      }
      updates.quantity = quantity;
    }

    if (condition !== undefined) {
      if (!['whole', 'peel', 'rotten'].includes(condition)) {
        return NextResponse.json({ error: 'Condition harus berupa whole, peel, atau rotten.' }, { status: 400 });
      }
      updates.condition = condition;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diperbarui.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ingredients')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ status: 'success', message: 'Bahan diperbarui.' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error PATCH /api/ingredients/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handler untuk DELETE (tombol trash)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ status: 'success', message: 'Bahan dihapus.' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error DELETE /api/ingredients/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
