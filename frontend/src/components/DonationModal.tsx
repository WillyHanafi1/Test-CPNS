"use client";
import Modal from "@/components/Modal";
import DonationForm from "@/components/donations/DonationForm";
export default function DonationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={isOpen} title="Dukung TOCPNS" onClose={onClose}>
      {isOpen && <DonationForm />}
    </Modal>
  );
}
